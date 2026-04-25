import React, { useState, useEffect } from 'react';
import {
  Archive,
  Search,
  Filter,
  Trash2,
  X,
  ChevronDown,
  Calendar,
  User,
  Clock,
  Undo2,
  History,
  FileText
} from 'lucide-react';
import {
  useFetchArticlesQuery,
  useUnarchiveArticleMutation,
  useBulkUnarchiveArticlesMutation,
  useDeleteArticleMutation,
  useBulkDeleteArticlesMutation,
  useFetchArticleByIdQuery
} from '../../redux/features/articles/articlesApi';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ArticlePreviewModal from '../../utils/ArticlePreviewModal';

const ArchivedArticlesPage = () => {
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [previewArticleId, setPreviewArticleId] = useState(null);

  const currentUser = useSelector(state => state.auth.user);

  const { data: previewArticle } = useFetchArticleByIdQuery(previewArticleId, {
    skip: !previewArticleId
  });

  // RTK Query hooks with all necessary parameters
  const { data: articlesData, refetch, isLoading, isError } = useFetchArticlesQuery({
    search: searchQuery,
    status: 'archived', // Force status filter
    isArchived: true, // Ensure archived filter
    page: currentPage,
    pageSize,
    sortBy,
    startDate: dateRange.start,
    endDate: dateRange.end,
    category: filterCategory !== 'all' ? filterCategory : undefined,
  });

  const [unarchiveArticle, { isLoading: isUnarchiving }] = useUnarchiveArticleMutation();
  const [bulkUnarchiveArticles, { isLoading: isBulkUnarchiving }] = useBulkUnarchiveArticlesMutation();
  const [deleteArticle, { isLoading: isDeleting }] = useDeleteArticleMutation();
  const [bulkDeleteArticles, { isLoading: isBulkDeleting }] = useBulkDeleteArticlesMutation();

  // Ensure articles array is handled properly
  const articles = articlesData?.articles || [];
  const totalArticles = articlesData?.totalCount || 0;
  const totalPages = articlesData?.totalPages || 1;

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear any existing timeout
    useEffect(() => {
      return () => {
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
      };
    }, [searchTimeout]);

    useEffect(() => {
      console.log('Parent - Current previewArticleId:', previewArticleId);
    }, [previewArticleId]);

    // Set new timeout
    const timeout = setTimeout(() => {
      refetch();
    }, 500);

    setSearchTimeout(timeout);
  };

  // Selection handlers
  const toggleSelectAll = () => {
    setSelectedArticles(prev =>
      prev.length === articles.length ? [] : articles.map(a => a._id)
    );
  };

  const toggleSelectArticle = (articleId) => {
    setSelectedArticles(prev =>
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1); // Reset to first page when filters change
    refetch();
    setShowFilterMenu(false);
  };

  // Unarchive handler
  const handleUnarchive = async () => {
    try {
      if (selectedArticles.length === 1) {
        await unarchiveArticle(selectedArticles[0]).unwrap();
        toast.success('Article restored successfully');
      } else {
        await bulkUnarchiveArticles(selectedArticles).unwrap();
        toast.success(`${selectedArticles.length} articles restored successfully`);
      }
      setSelectedArticles([]);
      setShowUnarchiveModal(false);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to restore articles');
    }
  };

  // Delete handler
  // Delete handler
const handleDelete = async () => {
  if (!deleteReason.trim()) {
    toast.error('Please provide a reason for deletion');
    return;
  }

  try {
    if (selectedArticles.length === 1) {
      // Fix: Pass only the ID directly, not an object with ID and data
      await deleteArticle(selectedArticles[0]).unwrap();
      toast.success('Article deleted permanently');
    } else {
      await bulkDeleteArticles({
        articleIds: selectedArticles,
        deletedBy: currentUser?.id,
        reason: deleteReason
      }).unwrap();
      toast.success(`${selectedArticles.length} articles deleted permanently`);
    }
    setSelectedArticles([]);
    setDeleteReason('');
    setShowDeleteModal(false);
    refetch();
  } catch (error) {
    toast.error(error?.data?.message || 'Failed to delete articles');
  }
};

  const resetFilters = () => {
    setFilterCategory('all');
    setDateRange({ start: '', end: '' });
    setSortBy('newest');
    setSearchQuery('');
    setCurrentPage(1);
    refetch();
  };

  // Handle pagination
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Effect to refetch when filters change
  useEffect(() => {
    refetch();
  }, [currentPage, pageSize, sortBy, refetch]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-800/50 text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-3">
                <History className="w-4 h-4" />
                Archive Management
              </div>
              <h1 className="text-3xl font-bold">Archived Articles</h1>
              <p className="text-blue-200 mt-2">View and manage archived articles</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUnarchiveModal(true)}
                disabled={!selectedArticles.length || isUnarchiving || isBulkUnarchiving}
                className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 ${
                  !selectedArticles.length || isUnarchiving || isBulkUnarchiving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Undo2 className="w-4 h-4" />
                Restore ({selectedArticles.length})
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                disabled={!selectedArticles.length || isDeleting || isBulkDeleting}
                className={`bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 ${
                  !selectedArticles.length || isDeleting || isBulkDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedArticles.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-white border-b border-gray-200 shadow-sm">
            {/* Search/Filter section */}
            <div className="container mx-auto px-6 py-4">
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                {/* Search Input */}
                <div className="relative flex-1 max-w-xl">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search archived articles..."
                    className="block w-full py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        refetch(); // Refetch after clearing search
                      }}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Filter Button and Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Filter className="w-5 h-5" />
                    Filters
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showFilterMenu && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg z-10 border border-gray-200 p-4 animate-fadeIn">
                      <div className="space-y-4">
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

                        {/* Archive Date Range */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Archive Date</label>
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

                        {/* Sort Options */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="newest">Newest Archived</option>
                            <option value="oldest">Oldest Archived</option>
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
                            onClick={applyFilters}
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

          {/* Articles List */}
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading articles...</p>
            </div>
          ) : isError ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <X className="w-8 h-8" />
              </div>
              <p className="text-gray-700 text-lg font-medium">Failed to load archived articles</p>
              <button
                onClick={() => refetch()}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : articles.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-600 mb-4">
                <Archive className="w-8 h-8" />
              </div>
              <p className="text-gray-700 text-lg font-medium">No archived articles found</p>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              {/* Select All Header */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedArticles.length === articles.length && articles.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">
                      {selectedArticles.length === 0
                        ? `${totalArticles} article${totalArticles !== 1 ? 's' : ''}`
                        : `${selectedArticles.length} selected`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Articles */}
              <div className="divide-y divide-gray-200">
                {articles.map(article => (
                  <div key={article._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedArticles.includes(article._id)}
                        onChange={() => toggleSelectArticle(article._id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <h2 className="text-lg font-medium text-gray-900">{article.title}</h2>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  console.log('Clicked preview for article:', article._id);
                                  setPreviewArticleId(article._id);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                              >
                                <FileText className="w-4 h-4" />
                                Preview
                              </button>
                              <span className="text-sm text-gray-500">
                                {new Date(article.createdAt).toLocaleDateString()}
                              </span>
                            </div>`
                          </div>
                        <p className="text-gray-600 mt-1 line-clamp-2">{article.description}</p>

                        {/* Archive Details */}
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                          {console.log('Article Data:', article)} {/* Add this line */}
                          {console.log('Archive Info:', article.archiveInfo)} {/* Add this line */}

                          {article.archiveInfo?.archivedBy?.username && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>Archived by: {article.archiveInfo.archivedBy.username || 'Admin'}
                              </span>
                            </div>
                          )}
                          {article.archiveInfo?.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Archived on: {new Date(article.archiveInfo.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          {article.archiveInfo?.reason && (
                            <div className="flex items-center gap-1">
                              <Archive className="w-4 h-4" />
                              <span>Reason: {article.archiveInfo.reason}</span>
                            </div>
                          )}
                          {article.archiveInfo?.note && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              <span>Note: {article.archiveInfo.note}</span>
                            </div>
                          )}
                          {article.archiveInfo?.originalStatus && (
                            <div className="flex items-center gap-1">
                              <History className="w-4 h-4" />
                              <span>Original status: {article.archiveInfo.originalStatus}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {previewArticleId && (
                <ArticlePreviewModal
                  articleId={previewArticleId}
                  onClose={() => setPreviewArticleId(null)}
                />
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Previous
                    </button>

                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handlePageChange(index + 1)}
                        className={`px-3 py-1 rounded ${
                          currentPage === index + 1
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Modals */}
          {showUnarchiveModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <div className="text-center">
                  <Undo2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Restore {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''}?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    This will make the article{selectedArticles.length > 1 ? 's' : ''} visible publicly again.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowUnarchiveModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUnarchive}
                      disabled={isUnarchiving || isBulkUnarchiving}
                      className={`flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg ${
                        isUnarchiving || isBulkUnarchiving ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {(isUnarchiving || isBulkUnarchiving) ? 'Restoring...' : 'Confirm Restore'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full">
                <div className="text-center">
                  <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    Delete {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''} permanently?
                  </h3>
                  <div className="mb-4">
                    <input
                      type="text"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Enter deletion reason..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={!deleteReason.trim() || isDeleting || isBulkDeleting}
                      className={`flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg ${
                        !deleteReason.trim() || isDeleting || isBulkDeleting ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {(isDeleting || isBulkDeleting) ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivedArticlesPage;
