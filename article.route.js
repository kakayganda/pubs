const express = require('express');
const Article = require('../model/article.model.js');
const Comment = require('../model/comment.model.js');
const Notification = require('../model/notification.model.js');
const verifyToken = require('../middleware/verifyToken.js');
const isAdmin = require('../middleware/isAdmin.js');
const isWriter = require('../middleware/isWriter.js');
const router = express.Router();
const cloudinary = require('../utils/cloudinaryConfig.js');
const multer = require('multer');
const isAdminWriter = require('../middleware/isAdminWriter.js');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create a utility function at the top of your article routes file
const createArticleNotification = async (articleId) => {
  try {
    const article = await Article.findById(articleId)
      .populate('author', 'username email');

    if (article && article.status === 'published') {
      // Create notification as before
      const notification = new Notification({
        article: articleId,
        type: 'article'
      });
      await notification.save();

      // Send email to all confirmed subscribers
      const subscribers = await Subscription.find({ confirmed: true });
      const emailPromises = subscribers.map(subscriber =>
        transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: subscriber.email,
          subject: `New Article: ${article.title}`,
          html: `
            <h2>${article.title}</h2>
            <p><strong>College:</strong> ${article.college}</p>
            <p><strong>Author:</strong> ${article.author.username}</p>
            <p><strong>Posted:</strong> ${new Date(article.createdAt).toLocaleDateString()}</p>
            <p>${article.description}</p>
            <a href="${process.env.FRONTEND_URL}/articles/${article._id}"
               style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; display: inline-block;">
              Read More
            </a>
          `
        })
      );

      await Promise.all(emailPromises);
    }
  } catch (error) {
    console.error('Error in notification/email process:', error);
  }
};

// create an article
router.post('/create-post', verifyToken, isWriter, upload.single('coverImg'), async (req, res) => {
  try {
    const { title, description, content, college, category, status } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ error: 'Cover image is required' });
    }

    // Convert buffer to base64
    const fileStr = req.file.buffer.toString('base64');
    const fileType = req.file.mimetype;

    // Create upload string
    const uploadStr = `data:${fileType};base64,${fileStr}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(uploadStr, {
      upload_preset: 'df7xwzi0', // your upload preset
    });

    // Create article with Cloudinary URL
    const newArticle = new Article({
      title,
      description,
      content,
      coverImg: uploadResponse.secure_url,
      college,
      category,
      author: userId,
      status: status || 'pending',
      tags: req.body.tags ? JSON.parse(req.body.tags) : [] // Add tags
    });

    await newArticle.save();

    if (status === 'published') {
      await createArticleNotification(newArticle._id);
    }

    const createdArticle = await Article.findById(newArticle._id)
    .populate('author', 'username email'); // Add population

    res.status(201).json({
      message: 'Article created successfully',
      article: createdArticle
    });
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({
      message: 'Error creating article',
      error: error
    });
  }
});

// get all articles
router.get('/', async (req, res) => {
  try {
    const {
      search,
      college,
      category,
      status = 'all', // Changed default to 'all'
      sortBy = 'createdAt',
      sortOrder = -1,
      page = 1,
      pageSize = 12,
      startDate,
      endDate,
      isArchived = false,
      tags,
    } = req.query;

    let query = {
      isArchived: isArchived === 'true'
    };

    if (tags) {
      const tagsArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagsArray };
    }

    // Handle status filtering differently for archived articles
    if (isArchived === 'true') {
      query.status = 'archived';
    } else {
      if (status !== 'all') {
        query.status = status; // Use the exact status requested
      }
    }

    // Rest of the filtering logic remains the same
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } }
      ];
    }

    if (college) query.college = college;
    if (category) query.category = category;

    // Add population for archiveInfo
    const articles = await Article.find(query)
      .populate('author', 'email username')
      .populate('archiveInfo.archivedBy', 'name username', 'User') // Add this line
      .sort({ [sortBy]: parseInt(sortOrder) })
      .skip((parseInt(page) - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize));

    res.status(200).json({
      articles,
      total: await Article.countDocuments(query)
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ message: "Error fetching articles" });
  }
});

// get single article by id
router.get("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Article.findById(postId)
      .populate('author', 'email username')
      .populate('revisionHistory.adminReviewer', 'username') // Populate admin reviewer
      .lean(); // Use lean() for better performance

    if (!post) {
      return res.status(404).send({ message: "Post not found" });
    }

    // Parse revision history dates
    const postWithRevisions = {
      ...post,
      revisionHistory: post.revisionHistory?.map(rev => ({
        ...rev,
        revisedAt: new Date(rev.revisedAt).toISOString(),
        adminReviewer: rev.adminReviewer || null
      })) || []
    };

    const comments = await Comment.find({ postId }).populate('user', "username email");

    res.status(200).send({
      post: postWithRevisions,
      comments
    });

  } catch (error) {
    console.error("Error fetching single post: ", error);
    res.status(500).send({ message: "Error fetching single post" });
  }
});

// update an article
router.patch("/update-post/:id", verifyToken, isAdminWriter, upload.single('coverImg'), async (req, res) => {
  if (req.file) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Only JPEG, PNG and GIF are allowed."
      });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      return res.status(400).json({
        message: "File too large. Maximum size is 5MB."
      });
    }
  }

  try {
    const postId = req.params.id;

    // Log incoming request data for debugging
    console.log('Request body:', req.body);
    console.log('File:', req.file);

    // Initialize updateData with the parsed body
    let updateData = {};

    // Handle string fields
    ['title', 'description', 'college', 'category', 'status'].forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle content separately since it might be JSON
    if (req.body.content) {
      try {
        updateData.content = typeof req.body.content === 'object'
          ? JSON.stringify(req.body.content)
          : req.body.content;
      } catch (err) {
        console.error('Error processing content:', err);
        updateData.content = req.body.content;
      }
    }

    // Convert the college to uppercase if it exists
    if (updateData.college) {
      updateData.college = updateData.college.toUpperCase();
    }

    // Handle image upload if a new image is provided
    if (req.file) {
      try {
        // Convert buffer to base64
        const fileStr = req.file.buffer.toString('base64');
        const fileType = req.file.mimetype;

        // Create upload string
        const uploadStr = `data:${fileType};base64,${fileStr}`;

        console.log('Attempting to upload to Cloudinary...');

        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(uploadStr, {
          upload_preset: 'df7xwzi0',
        });

        console.log('Cloudinary upload response:', uploadResponse);

        // Add the new image URL to updateData
        updateData.coverImg = uploadResponse.secure_url;

        // Try to delete old image
        try {
          const oldPost = await Article.findById(postId);
          if (oldPost && oldPost.coverImg) {
            const oldImagePublicId = oldPost.coverImg.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(oldImagePublicId);
          }
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
          // Continue with update even if delete fails
        }
      } catch (uploadError) {
        console.error("Error uploading image to Cloudinary:", uploadError);
        return res.status(400).json({
          message: "Error uploading image",
          error: uploadError.message
        });
      }
    }

    if (req.body.tags) {
      updateData.tags = JSON.parse(req.body.tags);
    }

    // Handle revision history updates
    if (req.body.revisionHistory) {
      try {
        // Parse the revisionHistory if it's a string
        let revisionHistoryData;
        if (typeof req.body.revisionHistory === 'string') {
          try {
            revisionHistoryData = JSON.parse(req.body.revisionHistory);
          } catch (parseError) {
            console.error('Error parsing revisionHistory string:', parseError);
            return res.status(400).json({
              message: "Invalid revisionHistory format",
              error: parseError.message
            });
          }
        } else if (Array.isArray(req.body.revisionHistory)) {
          revisionHistoryData = req.body.revisionHistory;
        } else {
          return res.status(400).json({
            message: "revisionHistory must be an array or valid JSON string"
          });
        }

        // Process each revision entry with careful content handling
        updateData.revisionHistory = revisionHistoryData.map(revision => {
          const processedRevision = { ...revision };

          // Handle adminReviewer - convert empty objects to null
          if (processedRevision.adminReviewer &&
              typeof processedRevision.adminReviewer === 'object' &&
              Object.keys(processedRevision.adminReviewer).length === 0) {
            processedRevision.adminReviewer = null;
          }

          // Handle originalContent - ensure it's properly stored as a string
          if (processedRevision.originalContent !== undefined) {
            // If it's already a string, validate it as JSON
            if (typeof processedRevision.originalContent === 'string') {
              try {
                // Try to parse it to validate
                JSON.parse(processedRevision.originalContent);
                // If parsing succeeds, we keep the string as is
              } catch (e) {
                // If it's not valid JSON, log a warning but keep the string
                console.warn(`Invalid JSON in originalContent: ${e.message}`);
              }
            } else if (typeof processedRevision.originalContent === 'object') {
              // Convert object to string
              processedRevision.originalContent = JSON.stringify(processedRevision.originalContent);
            }
          }

          // Similar handling for revisedContent
          if (processedRevision.revisedContent !== undefined) {
            if (typeof processedRevision.revisedContent === 'string') {
              try {
                JSON.parse(processedRevision.revisedContent);
              } catch (e) {
                console.warn(`Invalid JSON in revisedContent: ${e.message}`);
              }
            } else if (typeof processedRevision.revisedContent === 'object') {
              processedRevision.revisedContent = JSON.stringify(processedRevision.revisedContent);
            }
          }

          // Ensure revisedAt is a proper Date
          if (processedRevision.revisedAt && !(processedRevision.revisedAt instanceof Date)) {
            try {
              processedRevision.revisedAt = new Date(processedRevision.revisedAt);
            } catch (e) {
              console.error('Error converting revisedAt to Date:', e);
              processedRevision.revisedAt = new Date(); // Fallback to current date
            }
          }

          // Handle tags arrays
          ['originalTags', 'revisedTags'].forEach(tagField => {
            if (processedRevision[tagField]) {
              if (typeof processedRevision[tagField] === 'string') {
                try {
                  processedRevision[tagField] = JSON.parse(processedRevision[tagField]);
                } catch (e) {
                  console.error(`Error parsing ${tagField}:`, e);
                  processedRevision[tagField] = []; // Fallback to empty array
                }
              }
            }
          });

          return processedRevision;
        });

        // Log the processed revisionHistory for debugging
        console.log('Processed revisionHistory (first item):',
          updateData.revisionHistory.length > 0 ?
          {
            adminReviewer: updateData.revisionHistory[0].adminReviewer,
            originalContentType: typeof updateData.revisionHistory[0].originalContent,
            revisedContentType: typeof updateData.revisionHistory[0].revisedContent
          } : 'No revision history');

      } catch (err) {
        console.error('Error processing revision history:', err);
        return res.status(400).json({
          message: "Error processing revision history",
          error: err.message
        });
      }
    }

    console.log('Final update data:', updateData);

    const oldArticle = await Article.findById(postId);
    const wasPublished = oldArticle.status === 'published';
    const willBePublished = updateData.status === 'published';

    const updatedPost = await Article.findByIdAndUpdate(
      postId,
      updateData,
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!wasPublished && willBePublished) {
      await createArticleNotification(postId);
    }

    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost
    });
  } catch (error) {
    console.error("Error updating post: ", error);
    res.status(500).json({
      message: "Error updating post",
      error: error.message
    });
  }
});

// related posts
router.get("/related/:id",  async (req, res) => {
  try {
    const {id} = req.params;
    if(!id) {
      return res.status(400).send({ message: "Post id is required" })
    }

    const article = await Article.findById(id);

    if(!article) {
      return res.status(404).send({ message: "Post is not found" })
    }

    const titleRegex = new RegExp(article.title.split(' ').join("|"), "i");

    const relatedQuery = {
      _id: {$ne: id}, // exclude the current post by id
      title: {$regex: titleRegex},
      status: 'published' // only show published articles
    }

    const relatedPost = await Article.find(relatedQuery)
      .populate('author', 'username email')
      .sort({ createdAt: -1 }) // Optional: sort by newest first
      .limit(5); // Optional: limit the number of related posts

    res.status(200).send(relatedPost);

  } catch (error) {
    console.error("Error fetching related post: ", error);
    res.status(500).send({ message: "Error fetching related post" })
  }
});

// article like
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const articleId = req.params.id;
    const userId = req.user._id;

    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    await article.toggleLike(userId);

    res.json({
      message: "Like toggled successfully",
      likeCount: article.likeCount,
      isLiked: article.likes.includes(userId)
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ message: "Error toggling like" });
  }
});

// revision or rejection
router.patch("/review/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, revisionMessage, rejectionMessage } = req.body;

    console.log('Received review request:', {
      id,
      status,
      revisionMessage,
      rejectionMessage,
      user: req.user
    });

    if (!['revision', 'rejected'].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be either 'revision' or 'rejected'"
      });
    }

    // Validate article existence first
    const article = await Article.findById(id);
    if (!article) {
      console.log('Article not found:', id);
      return res.status(404).json({ message: "Article not found" });
    }

    const updateData = {
      status,
      reviewedBy: req.user.username,
      ...(status === 'revision' ? {
        revisionMessage,
        revisionDate: new Date()
      } : {
        rejectionMessage,
        rejectionDate: new Date()
      })
    };

    console.log('Updating article with:', updateData);

    const updatedArticle = await Article.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    console.log('Updated article:', updatedArticle);

    res.status(200).json({
      message: `Article ${status === 'revision' ? 'sent for revision' : 'rejected'} successfully`,
      article: updatedArticle
    });

  } catch (error) {
    console.error("Error updating article status:", error);
    res.status(500).json({
      message: "Error updating article status",
      error: error.message
    });
  }
});

// Archive single article
router.patch('/archive/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, note } = req.body;
    const userId = req.user._id;

    const article = await Article.findByIdAndUpdate(
      id,
      {
        isArchived: true,
        archiveInfo: {
          archivedBy: userId,
          reason,
          note,
          date: new Date()
        },
        status: 'archived' // Add 'archived' to your status enum in the model
      },
      { new: true }
    ).populate('author', '_id');

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

     // Create valid notification
     await Notification.create({
      type: 'archived', // Use valid enum value
      article: article._id,
      recipient: article.author._id, // Should now be populated
      message: `Your article "${article.title}" has been archived by ${req.user.name}. Reason: ${reason}`,
      archiveInfo: {
        date: new Date(),
        admin: req.user.name,
        reason: reason
      }
    });

    res.status(200).json({
      message: "Article archived successfully",
      article
    });
  } catch (error) {
    console.error("Error archiving article:", error);
    res.status(500).json({ message: "Error archiving article", error: error.message });
  }
});

// Bulk archive articles
router.patch('/bulk-archive', verifyToken, isAdmin, async (req, res) => {
  try {
    const { articleIds, reason, note } = req.body;
    const userId = req.user._id;

    // Get articles before update for notification data
    const articlesToArchive = await Article.find({ _id: { $in: articleIds } })
      .populate('author', '_id name');

    // Perform the update
    const result = await Article.updateMany(
      { _id: { $in: articleIds } },
      {
        isArchived: true,
        archiveInfo: {
          archivedBy: userId,
          reason,
          note,
          date: new Date()
        },
        status: 'archived'
      }
    );

    // Create notifications using pre-update articles
    const notifications = articlesToArchive.map(article => ({
      type: 'archived',
      article: article._id,
      recipient: article.author._id,
      message: `Your article "${article.title}" has been archived by ${req.user.name}. Reason: ${reason}`,
      archiveInfo: {
        date: new Date(),
        admin: req.user.name,
        reason: reason
      }
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      message: `${result.modifiedCount} articles archived successfully`,
    });
  } catch (error) {
    console.error("Error bulk archiving articles:", error);
    res.status(500).json({ message: "Error bulk archiving articles", error: error.message });
  }
});

// Unarchive single article
router.patch('/unarchive/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const article = await Article.findByIdAndUpdate(
      id,
      {
        isArchived: false,
        status: 'published',
        $unset: { archiveInfo: 1 }
      },
      { new: true }
    ).populate('author', '_id');  // Add population

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Create notification
    await Notification.create({
      type: 'unarchived',
      article: article._id,
      recipient: article.author._id,
      message: `Your article "${article.title}" has been restored by ${req.user.name}`
    });

    res.status(200).json({
      message: "Article restored successfully",
      article
    });
  } catch (error) {
    console.error("Error unarchiving article:", error);
    res.status(500).json({ message: "Error unarchiving article", error: error.message });
  }
});


// Bulk unarchive articles
router.patch('/bulk-unarchive', verifyToken, isAdmin, async (req, res) => {
  try {
    const { articleIds } = req.body;

    // Update articles
    const result = await Article.updateMany(
      { _id: { $in: articleIds } },
      {
        isArchived: false,
        status: 'published',
        $unset: { archiveInfo: 1 }
      }
    );

    // Get updated articles with authors
    const articles = await Article.find({ _id: { $in: articleIds } })
      .populate('author', '_id');

    // Create notifications
    const notifications = articles.map(article => ({
      type: 'unarchived',
      article: article._id,
      recipient: article.author._id,
      message: `Your article "${article.title}" has been restored by ${req.user.name} and is now publicly visible.`
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      message: `${result.modifiedCount} articles restored successfully`,
    });
  } catch (error) {
    console.error("Error bulk unarchiving articles:", error);
    res.status(500).json({ message: "Error bulk unarchiving articles", error: error.message });
  }
});

// Bulk delete articles
router.delete('/bulk-delete', verifyToken, isAdmin, async (req, res) => {
  try {
    const { articleIds } = req.body;

    const result = await Article.deleteMany({
      _id: { $in: articleIds },
      isArchived: true
    });

    await Comment.deleteMany({ postId: { $in: articleIds } });

    res.status(200).json({
      message: `${result.deletedCount} articles permanently deleted`,
    });
  } catch (error) {
    console.error("Error bulk deleting articles:", error);
    res.status(500).json({ message: "Error deleting articles", error: error.message });
  }
});

// delete an article
router.delete("/:id", verifyToken, isAdminWriter, async (req, res) => {
  try {
    const postId = req.params.id;
    const { reason, deletedBy } = req.body; // Add support for reason and deletedBy

    // Find the article first to make sure it exists
    const post = await Article.findById(postId);
    if (!post) {
      return res.status(404).send({ message: "Post not found" });
    }

    // Check if article is archived before allowing deletion
    if (!post.isArchived) {
      return res.status(400).send({ message: "Only archived articles can be deleted" });
    }

    // Now delete it
    await Article.findByIdAndDelete(postId);

    // Delete related comments
    await Comment.deleteMany({ postId: postId });

    res.status(200).send({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post: ", error);
    res.status(500).send({ message: "Error deleting post" });
  }
});

router.patch('/:id/view', verifyToken, async (req, res) => {
  try {
    const article = await Article.findOneAndUpdate(
      {
        _id: req.params.id,
        viewedBy: { $ne: req.user._id }
      },
      {
        $addToSet: { viewedBy: req.user._id },
        $inc: { viewCount: 1 }
      },
      { new: true }
    );

    if (!article) {
      return res.status(200).json({ message: 'View already counted' });
    }

    res.status(200).json(article);
  } catch (error) {
    res.status(500).json({ message: 'Error updating view count', error });
  }
});

module.exports = router;
