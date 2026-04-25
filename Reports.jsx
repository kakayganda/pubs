import React, { useState } from 'react';
import {
  TrendingUp,
  User,
  FileText,
  Heart,
  MessageSquare,
  Eye,
  Clock,
  Archive,
  AlertTriangle,
  CheckCircle,
  Edit,
  ChevronDown,
  Filter,
  Calendar,
  Download,
  BarChart2,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap, // Added for college filter
  AlertCircle
} from 'lucide-react';
import { useGetUserQuery } from '../../redux/features/auth/authApi';
import { useFetchArticlesQuery } from '../../redux/features/articles/articlesApi';
import { useGetCommentsQuery } from '../../redux/features/comments/commentApi';
import { categories, colleges } from './Components/constants'; // Import categories and colleges

import StatCard from './Components/StatCard';
import ExportModal from './Components/ExportModal';

import FeaturedArticleCard from './Components/FeaturedArticleCard';
import SortIndicator from './Components/SortIndicator';
import Pagination from './Components/Pagination';
import ArticleStatusCard from './Components/ArticleStatusCArd';

// Add this as a new component
const Toast = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = type === 'success' ? 'text-green-800' : 'text-red-800';
  const icon = type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />;

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-md border ${bgColor}`}>
      <div className="inline-flex items-center justify-center flex-shrink-0 mr-2">
        {icon}
      </div>
      <div className={`ml-3 text-sm font-medium ${textColor}`}>{message}</div>
      <button
        type="button"
        className={`ml-4 bg-transparent text-gray-400 hover:${textColor} rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8`}
        onClick={onClose}
      >
        <span className="sr-only">Close</span>
        <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
        </svg>
      </button>
    </div>
  );
};

// At the beginning of the Reports.jsx file, add these script tags
const injectScripts = () => {
  if (typeof window !== 'undefined') {
    if (!window.jspdf) {
      const jsPdfScript = document.createElement('script');
      jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      jsPdfScript.async = true;

      const autoTableScript = document.createElement('script');
      autoTableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js';
      autoTableScript.async = true;

      document.head.appendChild(jsPdfScript);
      document.head.appendChild(autoTableScript);
    }
  }
};

// Utility functions
const calculateStats = (usersData, articlesData, commentsData) => {
  const users = usersData?.users || [];
  const articles = articlesData?.articles || [];
  const comments = commentsData?.comments || [];

  const writerIds = [...new Set(articles.map(a => a.author?._id))];
  const commentCounts = comments.reduce((acc, comment) => {
    acc[comment.postId] = (acc[comment.postId] || 0) + 1;
    return acc;
  }, {});

  const statusCounts = articles.reduce((acc, article) => {
    acc[article.status] = (acc[article.status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalArticles: articlesData?.total || 0,
    totalUsers: users.length,
    totalWriters: writerIds.length,
    totalAdmins: users.filter(u => u.role === 'admin').length,
    mostViewed: articles.length > 0 ? articles.reduce((a, b) => (a.viewCount > b.viewCount ? a : b)) : null,
    mostLiked: articles.length > 0 ? articles.reduce((a, b) => (a.likeCount > b.likeCount ? a : b)) : null,
    mostCommented: articles.find(a => a._id === Object.entries(commentCounts).sort((a, b) => b[1] - a[1])[0]?.[0]),
    articleStatus: {
      published: statusCounts.published || 0,
      pending: statusCounts.pending || 0,
      revision: statusCounts.revision || 0,
      rejected: statusCounts.rejected || 0,
      archived: statusCounts.archived || 0
    },
    articles: articles.map(a => ({
      ...a,
      date: new Date(a.createdAt).toISOString().split('T')[0],
      views: a.viewCount
    }))
  };
};

const filterArticles = (articles, filters, commentsData) => {
  const { dateRange, archivedFilter, filterCategory, filterCollege, searchTerm } = filters;

  return articles.filter(article => {
    if (archivedFilter !== 'all' && article.status !== archivedFilter) return false;
    if (filterCategory !== '' && article.category !== filterCategory) return false;
    if (filterCollege !== '' && article.college !== filterCollege) return false;

    if (dateRange !== 'all-time') {
      const now = new Date();
      const articleDate = new Date(article.createdAt);
      const timeDiff = now - articleDate;

      switch (dateRange) {
        case 'last-24h': return timeDiff <= 24 * 60 * 60 * 1000;
        case 'last-week': return timeDiff <= 7 * 24 * 60 * 60 * 1000;
        case 'last-month': return timeDiff <= 30 * 24 * 60 * 60 * 1000;
        default: return true;
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        article.title?.toLowerCase().includes(term) ||
        article.author?.username?.toLowerCase().includes(term) ||
        article.category?.toLowerCase().includes(term) ||
        article.college?.toLowerCase().includes(term)
      );
    }

    return true;
  });
};

const sortArticles = (articles, sortBy, sortOrder) => {
  return [...articles].sort((a, b) => {
    const getValue = (item, field) => {
      switch (field) {
        case 'title': return item.title || '';
        case 'author': return item.author?.username || '';
        case 'category': return item.category || '';
        case 'college': return item.college || '';
        case 'status': return item.status || '';
        case 'viewCount': return item.viewCount || 0;
        case 'createdAt': default: return new Date(item.createdAt).getTime();
      }
    };

    const valA = getValue(a, sortBy);
    const valB = getValue(b, sortBy);

    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });
};

// Main Component
const Reports = () => {
  const [filters, setFilters] = useState({
    dateRange: 'all-time',
    filterCategory: '',
    filterCollege: '',
    archivedFilter: 'all',
    searchTerm: ''
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ sortBy: 'createdAt', sortOrder: 'desc' });
  const articlesPerPage = 12;
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const { data: usersData } = useGetUserQuery();
  const { data: articlesData } = useFetchArticlesQuery({ status: 'all', pageSize: 1000 });
  const { data: commentsData } = useGetCommentsQuery();

  const stats = calculateStats(usersData, articlesData, commentsData);
  const filtered = filterArticles(stats.articles, filters, commentsData);
  const sortedArticles = sortArticles(filtered, sortConfig.sortBy, sortConfig.sortOrder);

  const indexOfLastArticle = currentPage * articlesPerPage;
  const indexOfFirstArticle = indexOfLastArticle - articlesPerPage;
  const currentArticles = sortedArticles.slice(indexOfFirstArticle, indexOfLastArticle);
  const totalPages = Math.ceil(sortedArticles.length / articlesPerPage);

  React.useEffect(() => {
    injectScripts();
  }, []);

  const handleSort = (field) => {
    setSortConfig(prev => ({
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  // Original CSV export function
  const exportCSVReport = (filteredArticles, commentsData, dateRange) => {
    const reportData = filteredArticles.map(article => ({
      Title: article.title,
      Author: article.author?.username || 'Unknown',
      Category: article.category,
      College: article.college || 'N/A',
      Date: new Date(article.createdAt).toLocaleDateString(),
      Status: article.status,
      Views: article.viewCount,
      Likes: article.likeCount,
      Comments: commentsData?.comments.filter(c => c.postId === article._id).length || 0
    }));

    const totalViews = reportData.reduce((sum, article) => sum + article.Views, 0);
    const totalLikes = reportData.reduce((sum, article) => sum + article.Likes, 0);
    const totalComments = reportData.reduce((sum, article) => sum + article.Comments, 0);

    const BOM = '\uFEFF';
    const headers = Object.keys(reportData[0]);
    const reportTitle = `PubShark Publication Report - ${new Date().toLocaleDateString()}`;
    const dateRangeText = `Date Range: ${dateRange === 'all-time' ? 'All Time' :
                          dateRange === 'last-month' ? 'Last Month' :
                          dateRange === 'last-week' ? 'Last Week' : 'Last 24 Hours'}`;

    let csvContent = BOM;
    csvContent += `${reportTitle}\n${dateRangeText}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Summary Statistics\nTotal Articles,${reportData.length}\nTotal Views,${totalViews}\nTotal Likes,${totalLikes}\nTotal Comments,${totalComments}\n\n`;
    csvContent += headers.join(',') + '\n';

    reportData.forEach(row => {
      csvContent += headers.map(header => {
        const value = String(row[header]);
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pubshark_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();

    setToast({
      show: true,
      message: 'CSV report generated successfully!',
      type: 'success'
    });

    document.body.removeChild(link);
  };

  // New PDF export function
  const exportPDFReport = (filteredArticles, commentsData, dateRange) => {
    // Import jspdf and jspdf-autotable from CDN
    if (typeof window.jspdf === 'undefined') {
      setToast({ show: true, message: 'Error generating PDF report.', type: 'error' });
      return;
    }

      try  {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const reportData = prepareReportData(filteredArticles, commentsData);

        // Calculate summary statistics
        const totalViews = reportData.reduce((sum, article) => sum + article.Views, 0);
        const totalLikes = reportData.reduce((sum, article) => sum + article.Likes, 0);
        const totalComments = reportData.reduce((sum, article) => sum + article.Comments, 0);

        // Report title and metadata
        const reportTitle = `PubShark Publication Report`;
        const dateRangeText = dateRange === 'all-time' ? 'All Time' :
          dateRange === 'last-month' ? 'Last Month' :
          dateRange === 'last-week' ? 'Last Week' : 'Last 24 Hours';
        const generatedDate = new Date().toLocaleString();

        // Set document properties
        doc.setProperties({
          title: reportTitle,
          subject: `Report for ${dateRangeText}`,
          author: 'PubShark Admin',
          creator: 'PubShark Analytics'
        });

        // Add logo and header (placeholder shape for logo)
        doc.setFillColor(16, 59, 104); // Dark blue
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text(reportTitle, 15, 25);

        // Date range and generation info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text(`Date Range: ${dateRangeText}`, 15, 50);
        doc.text(`Generated: ${generatedDate}`, 15, 58);

        // Summary statistics section
        doc.setFontSize(16);
        doc.text("Summary Statistics", 15, 75);

        // Statistics boxes
        const drawStatBox = (x, y, width, height, title, value, color) => {
          doc.setFillColor(...color);
          doc.roundedRect(x, y, width, height, 3, 3, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(12);
          doc.text(title, x + 5, y + 12);
          doc.setFontSize(16);
          doc.text(value.toString(), x + 5, y + 26);
        };

        // Draw stat boxes
        drawStatBox(15, 80, 40, 35, "Articles", reportData.length, [25, 91, 255]);
        drawStatBox(65, 80, 40, 35, "Views", totalViews, [0, 150, 136]);
        drawStatBox(115, 80, 40, 35, "Likes", totalLikes, [233, 30, 99]);
        drawStatBox(165, 80, 40, 35, "Comments", totalComments, [76, 175, 80]);

        // Article Status Distribution
        const statusCounts = reportData.reduce((acc, article) => {
          acc[article.Status] = (acc[article.Status] || 0) + 1;
          return acc;
        }, {});

        // Status Table
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("Article Status Distribution", 15, 130);

        const statusData = Object.entries(statusCounts).map(([status, count]) => [
          status.charAt(0).toUpperCase() + status.slice(1),
          count,
          `${((count / reportData.length) * 100).toFixed(1)}%`
        ]);

        doc.autoTable({
          startY: 135,
          head: [['Status', 'Count', 'Percentage']],
          body: statusData,
          theme: 'striped',
          headStyles: { fillColor: [16, 59, 104], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: 15, right: 15 }
        });

        // Articles Table
        doc.setFontSize(16);
        doc.text("Article Details", 15, doc.autoTable.previous.finalY + 15);

        // Transform data for the articles table
        const articlesTableData = reportData.map(article => [
          article.Title.length > 20 ? article.Title.substring(0, 20) + '...' : article.Title,
          article.Author,
          article.Category,
          article.Date,
          article.Status,
          article.Views,
          article.Likes,
          article.Comments
        ]);

        // Create the articles table
        doc.autoTable({
          startY: doc.autoTable.previous.finalY + 20,
          head: [['Title', 'Author', 'Category', 'Date', 'Status', 'Views', 'Likes', 'Comments']],
          body: articlesTableData,
          theme: 'striped',
          headStyles: { fillColor: [16, 59, 104], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: 15, right: 15 },
          styles: { overflow: 'linebreak', cellWidth: 'wrap' },
          columnStyles: {
            0: { cellWidth: 40 }, // Title column
            4: { cellWidth: 20 }  // Status column
          }
        });

        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.getHeight();
          doc.text(`Page ${i} of ${pageCount}`, 15, pageHeight - 10);
          doc.text('PubShark Admin Dashboard', pageSize.getWidth() - 65, pageHeight - 10);
        }

        setToast({
          show: true,
          message: 'PDF report generated successfully!',
          type: 'success'
        });

        // Save the PDF
        doc.save(`pubshark_report_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (error) {
        console.error('Error generating PDF report:', error);
        setToast({
          show: true,
          message: 'Error generating PDF report. Please try again.',
          type: 'error'
        });
      };
  };

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const TableHeader = ({ fields, sortConfig, handleSort }) => (
  <thead className="bg-gray-50">
    <tr>
      {fields.map((field) => {
        const displayName =
          field === 'createdAt' ? 'Date' :
          field === 'viewCount' ? 'Views' :
          field.charAt(0).toUpperCase() + field.slice(1);

        return (
          <th
            key={field}
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => handleSort(field)}
          >
            {displayName}
            <SortIndicator field={field} sortBy={sortConfig.sortBy} sortOrder={sortConfig.sortOrder} />
          </th>
        );
      })}
    </tr>
  </thead>
);

  // Main export handler function
  const handleExport = (format) => {
    if (format === 'pdf') {
      exportPDFReport(sortedArticles, commentsData, filters.dateRange);
    } else {
      exportCSVReport(sortedArticles, commentsData, filters.dateRange);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const prepareReportData = (articles, commentsData) => {
    return articles.map(article => ({
      Title: article.title,
      Author: article.author?.username || 'Unknown',
      Category: article.category,
      College: article.college || 'N/A',
      Date: new Date(article.createdAt).toLocaleDateString(),
      Status: article.status,
      Views: article.viewCount,
      Likes: article.likeCount,
      Comments: commentsData?.comments.filter(c => c.postId === article._id).length || 0
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Publication Reports</h1>
                <p className="text-blue-200 mt-2">Comprehensive analytics for PubShark</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/10 rounded-lg p-2 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-300" />
                  <select
                    className="bg-transparent text-white border-none focus:ring-0 text-sm appearance-none px-2 py-1"
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    style={{ color: 'white' }}
                  >
                    <option value="all-time" className="bg-blue-800 text-white">All Time</option>
                    <option value="last-month" className="bg-blue-800 text-white">Last Month</option>
                    <option value="last-week" className="bg-blue-800 text-white">Last Week</option>
                    <option value="last-24h" className="bg-blue-800 text-white">Last 24 Hours</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-blue-300" />
                </div>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  onClick={() => setIsExportModalOpen(true)}
                >
                  <Download className="w-5 h-5" />
                  <span>Export Report</span>
                </button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={FileText} title="Total Articles" value={stats.totalArticles} bgColor="bg-blue-600" />
              <StatCard icon={User} title="Registered Users" value={stats.totalUsers} bgColor="bg-green-600" />
              <StatCard icon={Edit} title="Content Writers" value={stats.totalWriters} bgColor="bg-purple-600" />
              <StatCard icon={User} title="Admin Accounts" value={stats.totalAdmins} bgColor="bg-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Featured Articles Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeaturedArticleCard
                article={stats.mostViewed}
                icon={Eye}
                bgColor="bg-blue-100"
                iconText="text-blue-700"
                type="Most Viewed"
              />
              <FeaturedArticleCard
                article={stats.mostLiked}
                icon={Heart}
                bgColor="bg-red-100"
                iconText="text-red-700"
                type="Most Liked"
              />
              <FeaturedArticleCard
                article={stats.mostCommented}
                icon={MessageSquare}
                bgColor="bg-green-100"
                iconText="text-green-700"
                type="Most Commented"
              />
            </div>
          </section>

          {/* Article Status Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Article Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <ArticleStatusCard
                title="Published"
                count={stats.articleStatus.published}
                icon={CheckCircle}
                bgColor="bg-green-100"
                textColor="text-green-600"
              />
              <ArticleStatusCard
                title="Pending Approval"
                count={stats.articleStatus.pending}
                icon={Clock}
                bgColor="bg-amber-100"
                textColor="text-amber-600"
              />
              <ArticleStatusCard
                title="Needs Revision"
                count={stats.articleStatus.revision}
                icon={Edit}
                bgColor="bg-blue-100"
                textColor="text-blue-600"
              />
              <ArticleStatusCard
                title="Rejected"
                count={stats.articleStatus.rejected}
                icon={AlertTriangle}
                bgColor="bg-red-100"
                textColor="text-red-600"
              />
              <ArticleStatusCard
                title="Archived"
                count={stats.articleStatus.archived}
                icon={Archive}
                bgColor="bg-gray-100"
                textColor="text-gray-600"
              />
            </div>
          </section>

          {/* Article Management Section */}
          <section>
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Article Management</h2>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="relative flex-grow max-w-md">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search articles..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-white border border-gray-300 rounded-lg p-2 flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                      className="bg-transparent border-none focus:ring-0 text-sm text-gray-600"
                      value={filters.archivedFilter}
                      onChange={(e) => handleFilterChange('archivedFilter', e.target.value)}
                    >
                      <option value="all">All Statuses</option>
                      <option value="published">Published</option>
                      <option value="pending">Pending</option>
                      <option value="revision">Needs Revision</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="bg-white border border-gray-300 rounded-lg p-2 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-gray-500" />
                  <select
                    className="bg-transparent border-none focus:ring-0 text-sm text-gray-600"
                    value={filters.filterCategory}
                    onChange={(e) => handleFilterChange('filterCategory', e.target.value)}
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-white border border-gray-300 rounded-lg p-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-500" />
                  <select
                    className="bg-transparent border-none focus:ring-0 text-sm text-gray-600"
                    value={filters.filterCollege}
                    onChange={(e) => handleFilterChange('filterCollege', e.target.value)}
                  >
                    {colleges.map(college => (
                      <option key={college.value} value={college.value}>
                        {college.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Article Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['title', 'author', 'category', 'college', 'createdAt', 'status', 'viewCount'].map((field) => (
                      <th
                        key={field}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort(field)}
                      >
                        {field === 'createdAt' ? 'Date' :
                         field === 'viewCount' ? 'Views' :
                         field.charAt(0).toUpperCase() + field.slice(1)}
                        <SortIndicator field={field} sortBy={sortConfig.sortBy} sortOrder={sortConfig.sortOrder} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentArticles.length > 0 ? (
                    currentArticles.map(article => (
                      <tr key={article._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{article.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.author?.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.college || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium
                            ${article.status === 'published' ? 'bg-green-100 text-green-800' :
                              article.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              article.status === 'revision' ? 'bg-blue-100 text-blue-800' :
                              article.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`}>
                            {article.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.viewCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                        No articles found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {sortedArticles.length > articlesPerPage && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  paginate={paginate}
                  filteredArticles={sortedArticles}
                  articlesPerPage={articlesPerPage}
                  indexOfFirstArticle={indexOfFirstArticle}
                />
              )}
            </div>
          </section>
        </div>
      </div>
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={(format) => handleExport(format, sortedArticles, commentsData, filters.dateRange)}
      />
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </div>
  );
};

export default Reports;
