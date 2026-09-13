function buildPaginationMeta(page, limit, total) {
  const pageNum = Math.max(page, 1);
  const limitNum = Math.max(Math.min(limit, 200), 1);
  const totalPages = Math.ceil(total / limitNum) || 1;

  return {
    page: pageNum,
    pageSize: limitNum,
    total,
    totalPages,
    hasNext: pageNum < totalPages,
    hasPrev: pageNum > 1
  };
}

function parsePagination(query, defaults = {}) {
  const page = Math.max(parseInt(query.page, 10) || defaults.page || 1, 1);
  const limit = Math.max(Math.min(parseInt(query.limit, 10) || defaults.limit || 25, 200), 1);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function applySorting(query, allowedSortFields = [], defaultSort = 'created_at') {
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : defaultSort;
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return { [sortBy]: sortOrder };
}

module.exports = {
  buildPaginationMeta,
  parsePagination,
  applySorting
};