const express = require('express');
const Comment = require('../model/comment.model');
const verifyToken = require('../middleware/verifyToken'); // Adjust path as needed
const router = express.Router();

// Apply verifyToken middleware to all protected routes
router.use(verifyToken);

// create a comment
router.post('/post-comment', async (req, res) => {
  try {
    const newComment = new Comment({
      ...req.body,
      user: req.userId // Using userId from verifyToken middleware
    });
    await newComment.save();
    res.status(200).send({ message: "Comment created successfully", comment: newComment });
  } catch (error) {
    console.error("An error occurred while posting comment", error);
    res.status(500).send({ message: "An error occurred while posting comment" });
  }
});

// get all comments - This route might not need authentication
router.get('/total-comments', async (req, res) => {
  try {
    const comments = await Comment.find({});
    const totalComment = comments.length;
    res.status(200).send({ message: "Comments retrieved successfully", totalComment, comments });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "An error occurred while retrieving comments" });
  }
});

// edit comment
router.put('/edit-comment/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment: updatedComment } = req.body;

    // Validate input
    if (!updatedComment || updatedComment.trim().length === 0) {
      return res.status(400).send({ message: "Comment content cannot be empty" });
    }

    // Find the comment
    const comment = await Comment.findById(id);
    
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    // Check if user is authorized to edit the comment
    if (comment.user.toString() !== req.userId.toString()) {
      return res.status(403).send({ message: "Not authorized to edit this comment" });
    }

    // Update the comment
    comment.comment = updatedComment;
    comment.isEdited = true;
    comment.editedAt = Date.now();

    await comment.save();
    
    // Populate user information before sending response
    const updatedCommentDoc = await Comment.findById(id)
      .populate('user', 'username avatar role');

    res.status(200).send({
      success: true,
      message: "Comment updated successfully",
      comment: updatedCommentDoc
    });

  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).send({ message: "An error occurred while updating the comment" });
  }
});

// Delete comment
router.delete('/delete-comment/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    // Check if user is admin or comment owner using req.user from verifyToken
    if (req.user.role !== 'admin' && comment.user.toString() !== req.userId.toString()) {
      return res.status(403).send({ message: "Not authorized to delete this comment" });
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.status(200).send({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).send({ message: "An error occurred while deleting comment" });
  }
});

// Like comment
router.put('/like-comment/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    // Remove from dislikes if exists
    const dislikeIndex = comment.dislikes.indexOf(req.userId);
    if (dislikeIndex > -1) {
      comment.dislikes.splice(dislikeIndex, 1);
    }

    // Toggle like
    const likeIndex = comment.likes.indexOf(req.userId);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(req.userId);
    }

    await comment.save();
    
    // Populate the user field before sending response
    const updatedComment = await Comment.findById(comment._id).populate('user', 'username avatar role');
    
    res.status(200).send({ 
      success: true,
      message: "Comment like updated",
      comment: updatedComment
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    res.status(500).send({ message: "An error occurred while liking comment" });
  }
});

// Dislike comment
router.put('/dislike-comment/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).send({ message: "Comment not found" });
    }

    // Remove from likes if exists
    const likeIndex = comment.likes.indexOf(req.userId);
    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    }

    // Toggle dislike
    const dislikeIndex = comment.dislikes.indexOf(req.userId);
    if (dislikeIndex > -1) {
      comment.dislikes.splice(dislikeIndex, 1);
    } else {
      comment.dislikes.push(req.userId);
    }

    await comment.save();
    
    // Populate the user field before sending response
    const updatedComment = await Comment.findById(comment._id).populate('user', 'username avatar role');

    res.status(200).send({ 
      success: true,
      message: "Comment dislike updated",
      comment: updatedComment
    });
  } catch (error) {
    console.error("Error disliking comment:", error);
    res.status(500).send({ message: "An error occurred while disliking comment" });
  }
});

module.exports = router;