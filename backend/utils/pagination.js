const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

// Core pagination function

/**
 * Paginates a MongoDB query and returns a promise that resolves to an object with
 * the following properties:
 * - success: boolean indicating whether the pagination was successful
 * - data: the paginated results as an array of objects
 * - total: the total count of documents in the query
 * - limit: the number of documents returned per page
 * - page: the current page number
 * - pages: the total number of pages
 *
 * @param {number} page - the current page number
 * @param {number} limit - the number of documents returned per page
 * @param {mongoose.Query} query - the MongoDB query to paginate
 * @param {boolean} [useLean=false] - whether to use the lean() method when executing the query
 * @returns {Promise<Object>} a promise that resolves to the paginated results
 */
export async function paginateQuery(page, limit, query, useLean = true) {
  try {
    page = Math.max(Number(page) || DEFAULT_PAGE, 1);
    limit = Math.max(Number(limit) || DEFAULT_LIMIT, 1);

    // Clone the query to count the total number of documents
    const countQuery = query.model.find(query.getFilter());
    const total = await countQuery.countDocuments();

    // Calculate skip and pages
    const { skip, pages } = calculatePagination(page, limit, total);

    // Adjust page number if it exceeds total pages
    page = Math.min(page, pages);

    // Execute the paginated query
    const results = await query.skip(skip).limit(limit).lean(useLean).exec();

    return {
      success: true,
      data: results,
      total,
      limit,
      page,
      pages,
    };
  } catch (error) {
    console.error("Error in paginateQuery:", error);
    return {
      success: false,
      message: `An error occurred while paginating the query: ${error.message}`,
    };
  }
}

// Calculate skip and pages
export function calculatePagination(page, limit, total) {
  const pages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;
  return { skip, pages };
}
