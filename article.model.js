const mongoose = require('mongoose');

const revisionEntrySchema = new mongoose.Schema({
  originalContent: {
    type: String,
    required: true
  },
  revisedContent: {
    type: String,
    required: true
  },
  revisedAt: {
    type: Date,
    default: Date.now
  },
  adminReviewer: {
    type: String  // Changed from ObjectId to String
  },
  revisionMessage: {
    type: String
  }
});

const ArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  content: {
    type: String,
    required: true,
  },
  coverImg: {
    type: String,
    required: true
  },
  college: {
    required: true,
    type: String
  },
  category: {
    required: true,
    type: String
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['revision', 'pending', 'published', 'rejected', 'archived'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  revisionMessage: {
    type: String,
    default: ' '
  },
  rejectionMessage: {
    type: String,
    default: ' '
  },
  revisionDate: {
    type: Date,
    default: Date.now
  },
  rejectionDate: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: String
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archiveInfo: {
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reason: String,
    note: String,
    date: Date,
    originalStatus: String
  },
  viewedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  tags: {
    type: [String],
    default: []
  },
  revisionHistory: [revisionEntrySchema],
  flags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flag'
  }]
}, {
  timestamps: true
});

// Add a method to handle likes
ArticleSchema.methods.toggleLike = async function(userId) {
  const isLiked = this.likes.includes(userId);

  if (isLiked) {
    this.likes.pull(userId);
    this.likeCount = Math.max(0, this.likeCount - 1);
  } else {
    this.likes.push(userId);
    this.likeCount += 1;
  }

  return this.save();
};

const Article = mongoose.model("Article", ArticleSchema);

module.exports = Article;
