const express = require("express");
const db = require("../models");
const verifyToken = require("../middlewares/verifyToken");
const ComicRoute = express.Router();

// Route bảo mật mẫu
ComicRoute.get("/protected", verifyToken, (req, res) => {
  res.json({
    message: "This is a protected route",
    userId: req.userId,
    role: req.role,
  });
});

// Lấy tất cả truyện đang đọc dở của user
ComicRoute.get("/reading-list", verifyToken, async (req, res) => {
  try {
    // Lấy tham số phân trang từ query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const validPage = page > 0 ? page : 1;
    const validLimit = limit > 0 ? limit : 10;
    const skip = (validPage - 1) * validLimit;

    // Đếm tổng số item
    const totalItems = await db.ComicReading.countDocuments({ 
      userId: req.userId 
    });

    // Lấy dữ liệu phân trang
    const readingList = await db.ComicReading.find({ userId: req.userId })
      .sort({ lastReadAt: -1 })
      .skip(skip)
      .limit(validLimit)
      .select("slug lastReadChapter lastReadAt");

    // Tính toán thông tin phân trang
    const totalPages = Math.ceil(totalItems / validLimit);

    res.status(200).json({
      message: "Successfully fetched reading list",
      data: readingList,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalItems,
        itemsPerPage: validLimit
      }
    });
    
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to get reading list"
    });
  }
});

// Lấy chapter đọc cuối của 1 truyện cụ thể
ComicRoute.get("/last-chapter/:slug", verifyToken, async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ message: "Slug is required" });
    }

    const record = await db.ComicReading.findOne({
      userId: req.userId,
      slug: slug
    });

    if (!record) {
      return res.status(404).json({ 
        message: "No reading progress found for this comic" 
      });
    }

    res.status(200).json({
      message: "Successfully fetched last read chapter",
      data: {
        slug: record.slug,
        lastReadChapter: record.lastReadChapter,
        lastReadAt: record.lastReadAt
      }
    });

  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to get last chapter"
    });
  }
});

// Thêm/Cập nhật tiến độ đọc truyện
ComicRoute.post("/update-progress", verifyToken, async (req, res) => {
  try {
    const { slug, chapter } = req.body;

    // Validate input
    if (!slug || !chapter) {
      return res.status(400).json({ 
        message: "Slug and chapter are required" 
      });
    }

    const updatedProgress = await db.ComicReading.findOneAndUpdate(
      { 
        userId: req.userId, 
        slug: slug 
      },
      {
        lastReadChapter: chapter,
        lastReadAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    res.status(200).json({
      message: "Reading progress updated successfully",
      data: {
        slug: updatedProgress.slug,
        lastReadChapter: updatedProgress.lastReadChapter,
        lastReadAt: updatedProgress.lastReadAt
      }
    });

  } catch (error) {
    // Xử lý lỗi duplicate key (nếu có)
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Duplicate reading record detected"
      });
    }
    
    res.status(500).json({
      message: error.message || "Failed to update reading progress"
    });
  }
});


// Thêm truyện vào danh sách yêu thích
ComicRoute.post("/favorites", verifyToken, async (req, res) => {
    try {
      const { slug, chapter } = req.body;
  
      // Validate input
      if (!slug) {
        return res.status(400).json({ 
          message: "Slug là bắt buộc" 
        });
      }
  
      const newFavorite = await db.ComicFavor.findOneAndUpdate(
        { 
          userId: req.userId, 
          slug: slug 
        },
        {
          lastReadChapter: chapter || null,
          lastReadAt: chapter ? new Date() : null
        },
        { 
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      );
  
      res.status(200).json({
        message: "Đã thêm vào danh sách yêu thích",
        data: {
          slug: newFavorite.slug,
          lastReadChapter: newFavorite.lastReadChapter,
          lastReadAt: newFavorite.lastReadAt
        }
      });
  
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "Truyện đã có trong danh sách yêu thích"
        });
      }
      
      res.status(500).json({
        message: error.message || "Lỗi khi thêm vào yêu thích"
      });
    }
  });
  
  // Xoá truyện khỏi danh sách yêu thích
  ComicRoute.delete("/favorites/:slug", verifyToken, async (req, res) => {
    try {
      const { slug } = req.params;
  
      if (!slug) {
        return res.status(400).json({ 
          message: "Slug là bắt buộc" 
        });
      }
  
      const result = await db.ComicFavor.deleteOne({ 
        userId: req.userId, 
        slug: slug 
      });
  
      if (result.deletedCount === 0) {
        return res.status(404).json({ 
          message: "Không tìm thấy truyện trong danh sách yêu thích" 
        });
      }
  
      res.status(200).json({
        message: "Đã xoá khỏi danh sách yêu thích",
        data: {
          slug: slug
        }
      });
  
    } catch (error) {
      res.status(500).json({
        message: error.message || "Lỗi khi xoá khỏi yêu thích"
      });
    }
  });
  
  // Lấy danh sách yêu thích
  ComicRoute.get("/favorites", verifyToken, async (req, res) => {
    try {
      const favorites = await db.ComicFavor.find({ userId: req.userId })
        .sort({ updatedAt: -1 })
        .select("slug lastReadChapter lastReadAt");
  
      res.status(200).json({
        message: "Danh sách yêu thích",
        count: favorites.length,
        data: favorites
      });
      
    } catch (error) {
      res.status(500).json({
        message: error.message || "Lỗi khi lấy danh sách yêu thích"
      });
    }
  });

module.exports = ComicRoute;