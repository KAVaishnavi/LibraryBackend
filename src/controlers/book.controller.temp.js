// TEMPORARY DELETE FUNCTION - BYPASSES PERMISSION CHECK
// This is for debugging the delete permission issue

const Book = require('../models/book.model');

const deleteBookTemp = async (req, res) => {
  try {
    console.log('🗑️ TEMP Delete request (bypassing permissions):', {
      bookId: req.params.id,
      userId: req.user.userId,
      userRole: req.user.role
    });

    const book = await Book.findById(req.params.id);
    if (!book) {
      console.log('❌ Book not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    console.log('📚 Book found:', {
      title: book.title,
      uploadedBy: book.uploadedBy.toString(),
      currentUser: req.user.userId.toString()
    });

    // BYPASSING PERMISSION CHECK FOR DEBUGGING
    console.log('⚠️ WARNING: Bypassing permission check for debugging');

    // Soft delete - set isActive to false instead of actually deleting
    await Book.findByIdAndUpdate(req.params.id, { isActive: false });

    console.log('✅ Book deleted successfully (temp):', book.title);
    res.status(200).json({
      success: true,
      message: `Book "${book.title}" has been deleted successfully (temporary bypass)`
    });
  } catch (error) {
    console.error('❌ Delete book error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete book: ' + error.message
    });
  }
};

module.exports = { deleteBookTemp };