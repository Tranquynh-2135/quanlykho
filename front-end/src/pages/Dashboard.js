const Dashboard = () => {
  return (
    <div>
      <h1 className="mb-4">👋 Xin chào, Quản lý kho!</h1>

      <div className="row">
        <div className="col-md-4">
          <div className="card text-white bg-primary mb-4">
            <div className="card-body">
              <h5>Tồn kho hiện tại</h5>
              <h2>1,245 sản phẩm</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-warning mb-4">
            <div className="card-body">
              <h5>Cảnh báo tồn thấp</h5>
              <h2>8 sản phẩm</h2>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-white bg-success mb-4">
            <div className="card-body">
              <h5>Nhập hôm nay</h5>
              <h2>15 phiếu</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="alert alert-danger">
        ⚠️ Có 8 sản phẩm sắp hết hàng! Vui lòng kiểm tra ngay.
      </div>
    </div>
  );
};

export default Dashboard;
