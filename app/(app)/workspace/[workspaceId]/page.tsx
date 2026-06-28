export default async function WorkspacePage() {
  return (
    <div className="flex-1 bg-white flex flex-col h-full">
       <div className="h-12 border-b flex items-center px-6 font-semibold text-gray-800 shadow-sm shrink-0">
          Tổng quan
       </div>
       <div className="flex-1 p-6 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
             <span className="text-3xl text-indigo-500">👋</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Chào mừng đến với Không gian làm việc</h2>
          <p className="text-center max-w-md">
            Hãy chọn một kênh bên trái để bắt đầu trò chuyện, hoặc tạo một danh mục và kênh mới nếu bạn là quản trị viên.
          </p>
       </div>
    </div>
  );
}
