import React, { useState, useEffect } from 'react';
import {
  Archive,
  Search,
  Filter,
  Check,
  Trash2,
  X,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Calendar,
  User,
  Clock,
  FileText
} from 'lucide-react';
import { useFetchArticlesQuery, useArchiveArticleMutation, useBulkArchiveArticlesMutation, useFetchArticleByIdQuery } from '../../redux/features/articles/articlesApi';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ArticlePreviewModal from '../../utils/ArticlePreviewModal';

const ArchivePage = () => {
  // States
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('published');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveNote, setArchiveNote] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [previewArticleId, setPreviewArticleId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // Default to 12 items per page

  // Get current user from Redux store (assumption)
  const currentUser = useSelector(state => state.auth.user);

  // RTK Query hooks (placeholder)
  const { data: articlesData, isLoading, isError } = useFetchArticlesQuery({
    page: currentPage,
    pageSize: pageSize,
    // Only send valid filters (exclude 'all' values)
    ...(filterStatus !== 'all' && { status: filterStatus }),
    ...(filterCategory !== 'all' && { category: filterCategory }),
    search: searchQuery,
    startDate: dateRange.start,
    endDate: dateRange.end,
    sortBy: sortBy,
    sortOrder: sortBy.includes('title') ? 1 : -1,
    // Add this parameter to get non-archived articles
    isArchived: false
  });
  const [archiveArticle] = useArchiveArticleMutation();
  const [bulkArchiveArticles] = useBulkArchiveArticlesMutation();

  // Filter and search articles
  const filteredArticles = articlesData?.articles?.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || article.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || article.category === filterCategory;

    const articleDate = new Date(article.createdAt);
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;

    const matchesDateRange =
      (!startDate || articleDate >= startDate) &&
      (!endDate || articleDate <= endDate);

    return matchesSearch && matchesStatus && matchesCategory && matchesDateRange;
  }) || [];

  // Sort articles based on selected sort method
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    switch(sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  // Select/deselect all articles
  const toggleSelectAll = () => {
    if (selectedArticles.length === sortedArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(sortedArticles.map(article => article._id)); // Changed to _id
    }
  };

  // Toggle selection of a single article
  const toggleSelectArticle = (articleId) => {
    if (selectedArticles.includes(articleId)) {
      setSelectedArticles(selectedArticles.filter(id => id !== articleId));
    } else {
      setSelectedArticles([...selectedArticles, articleId]);
    }
  };

  // Handle archiving process
  const handleArchive = async () => {
    if (selectedArticles.length === 0) return;

    const archiveData = {
      articleIds: selectedArticles,
      archivedBy: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role
      },
      reason: archiveReason,
      note: archiveNote,
      timestamp: new Date().toISOString()
    };

    try {
      if (selectedArticles.length === 1) {
        await archiveArticle({
          id: selectedArticles[0],
          data: archiveData
        }).unwrap();
      } else {
        await bulkArchiveArticles(archiveData).unwrap();
      }

      toast.success('Articles archived successfully');

      // Reset states after successful archiving
      setSelectedArticles([]);
      setArchiveReason('');
      setArchiveNote('');
      setShowArchiveModal(false);

      // Show success notification (implement based on your notification system)
    } catch (error) {
      // Handle error (implement based on your error handling system)
      console.error('Archive operation failed:', error);
      toast.error(error?.data?.message || 'Failed to archive article/s!');
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterCategory('all');
    setDateRange({ start: '', end: '' });
    setSortBy('newest');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-800/50 text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-3">
                <Archive className="w-4 h-4" />
                Article Management
              </div>
              <h1 className="text-3xl font-bold">Archive Articles</h1>
              <p className="text-blue-200 mt-2">Archive or remove articles from active publication</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title, content..."
                className="block w-full py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Filter className="w-5 h-5" />
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Filter Dropdown */}
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg z-10 border border-gray-200 p-4 animate-fadeIn">
                  <div className="space-y-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="pending">Pending Review</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Categories</option>
                        <option value="news">News</option>
                        <option value="events">Events</option>
                        <option value="research">Research</option>
                        <option value="achievements">Achievements</option>
                      </select>
                    </div>

                    {/* Date Range Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Publication Date</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500">From</label>
                          <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500">To</label>
                          <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="title-asc">Title (A-Z)</option>
                        <option value="title-desc">Title (Z-A)</option>
                      </select>
                    </div>

                    {/* Filter Actions */}
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <button
                        onClick={resetFilters}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        Reset all filters
                      </button>
                      <button
                        onClick={() => setShowFilterMenu(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 py-8">
        {/* Articles Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedArticles.length === sortedArticles.length && sortedArticles.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    {selectedArticles.length > 0 ? `Selected ${selectedArticles.length} of ${sortedArticles.length}` : 'Select All'}
                  </label>
                </div>

                {selectedArticles.length > 0 && (
                  <>
                    <button
                      onClick={() => setSelectedArticles([])}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      Clear selection
                    </button>

                    <button
                      onClick={() => setShowArchiveModal(true)}
                      disabled={selectedArticles.length === 0}
                      className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${selectedArticles.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Archive className="w-4 h-4" />
                      Archive Selected ({selectedArticles.length})
                    </button>
                  </>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {isLoading ? (
                  <span>Loading articles...</span>
                ) : (
                  <span>Showing {sortedArticles.length} of {articlesData?.articles?.length || 0} articles</span>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
              <p className="text-gray-600">Loading articles...</p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center bg-red-100 rounded-full p-4 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-gray-800 font-medium">Failed to load articles</p>
              <p className="text-gray-600 mt-2">Please try refreshing the page or contact support if the issue persists.</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && sortedArticles.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center bg-gray-100 rounded-full p-4 mb-4">
                <Archive className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-800 font-medium">No articles found</p>
              <p className="text-gray-600 mt-2">
                {searchQuery || filterStatus !== 'all' || filterCategory !== 'all' || dateRange.start || dateRange.end ?
                  'Try adjusting your filters or search query' :
                  'There are no articles available for archiving at this time'}
              </p>
              {(searchQuery || filterStatus !== 'all' || filterCategory !== 'all' || dateRange.start || dateRange.end) && (
                <button
                  onClick={resetFilters}
                  className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {/* Articles List */}
          {!isLoading && !isError && sortedArticles.length > 0 && (
            <div className="divide-y divide-gray-200">
              {sortedArticles.map(article => (
                <div
                  key={article._id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${selectedArticles.includes(article.id) ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center h-5 mt-1">
                      <input
                        type="checkbox"
                        checked={selectedArticles.includes(article._id)}
                        onChange={() => toggleSelectArticle(article._id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <h2 className="text-lg font-medium text-gray-900 truncate">{article.title}</h2>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            article.status === 'published' ? 'bg-green-100 text-green-800' :
                            article.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.status}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {article.category}
                          </span>
                        </div>
                      </div>

                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Published: {new Date(article.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>Author: {article.author.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{article.readTime} min read</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setPreviewArticleId(article._id)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      Preview
                    </button>

                    <button
                      onClick={() => {
                        setSelectedArticles([article.id]);
                        setShowArchiveModal(true);
                      }}
                      className="flex-shrink-0 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Archive article"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 relative animate-scaleIn"
            role="dialog"
            aria-labelledby="archive-modal-title"
            aria-modal="true"
          >
            <button
              onClick={() => setShowArchiveModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-2 bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center bg-red-100 rounded-full p-4 mb-4">
                  <Archive className="w-8 h-8 text-red-600" />
                </div>
                <h3 id="archive-modal-title" className="text-xl font-semibold text-gray-900">
                  Archive {selectedArticles.length > 1 ? `${selectedArticles.length} Articles` : 'Article'}
                </h3>
                <p className="text-gray-600 mt-2">
                  {selectedArticles.length > 1
                    ? 'These articles will be removed from public view but can be restored later.'
                    : 'This article will be removed from public view but can be restored later.'}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="archive-reason" className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for archiving*
                  </label>
                  <select
                    id="archive-reason"
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a reason</option>
                    <option value="outdated">Outdated content</option>
                    <option value="duplicate">Duplicate content</option>
                    <option value="incorrect">Incorrect information</option>
                    <option value="policy-violation">Policy violation</option>
                    <option value="reorganization">Content reorganization</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="archive-note" className="block text-sm font-medium text-gray-700 mb-1">
                    Additional notes
                  </label>
                  <textarea
                    id="archive-note"
                    value={archiveNote}
                    onChange={(e) => setArchiveNote(e.target.value)}
                    placeholder="Add any additional details here..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  ></textarea>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                  <p className="font-medium">Archive Information</p>
                  <p className="mt-1">
                    <span className="font-medium">User:</span> {currentUser?.name} ({currentUser?.role})
                  </p>
                  <p>
                    <span className="font-medium">Date:</span> {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  disabled={!archiveReason}
                  className={`flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${!archiveReason ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Archive className="w-5 h-5" />
                  Confirm Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    {previewArticleId && (
      <ArticlePreviewModal
        articleId={previewArticleId}
        onClose={() => setPreviewArticleId(null)}
      />
    )}

    {!isLoading && !isError && sortedArticles.length > 0 && (
        <div className="mt-8 flex items-center justify-between px-6 py-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={articlesData?.total <= currentPage * pageSize}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, articlesData?.total || 0)}</span> of{' '}
                <span className="font-medium">{articlesData?.total || 0}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  Page {currentPage} of {Math.ceil((articlesData?.total || 0) / pageSize)}
                </div>

                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * pageSize >= (articlesData?.total || 0)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
