// src/pages/Products.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Products.css'; // tạo file css nếu muốn style đẹp hơn

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Gọi API từ backend (product-service)
        const response = await axios.get('http://localhost:4001/products');
        
        // Nếu backend trả về { success: true, data: [...] }
        // thì lấy response.data.data
        // Nếu backend chỉ trả mảng trực tiếp thì dùng response.data luôn
        setProducts(response.data.data || response.data);
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        setError('Không thể tải danh sách sản phẩm. Vui lòng kiểm tra backend.');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="products-page">
      <h1>Quản lý Sản phẩm</h1>

      {products.length === 0 ? (
        <p>Chưa có sản phẩm nào trong kho.</p>
      ) : (
        <table className="products-table">
          <thead>
            <tr>
              <th>Mã SP</th>
              <th>Tên sản phẩm</th>
              <th>Giá bán</th>
              <th>Tồn kho</th>
              <th>Tồn tối thiểu</th>
              <th>Vị trí</th>
              <th>Nhà cung cấp</th>
              <th>Trạng thái</th>
              <th>Ảnh</th>
              <th>Mô tả</th>
              <th>Ngày tạo</th>
              <th>Ngày cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>{product.code}</td>
                <td>{product.name}</td>
                <td>{product.price.toLocaleString('vi-VN')} ₫</td>
                <td>{product.stock}</td>
                <td>{product.minStock}</td>
                <td>{product.location || '-'}</td>
                <td>{product.supplier || '-'}</td>
                <td>
                  <span className={`status ${product.status}`}>
                    {product.status === 'active' ? 'Hoạt động' :
                     product.status === 'inactive' ? 'Ngừng kinh doanh' : 'Ngừng sản xuất'}
                  </span>
                </td>
                <td>
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }} 
                    />
                  ) : (
                    '-'
                  )}
                </td>
                <td>{product.description || '-'}</td>
                <td>{new Date(product.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>{new Date(product.updatedAt).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Products;