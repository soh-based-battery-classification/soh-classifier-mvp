import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="notfound">
      <p className="notfound__code">404</p>
      <h1 className="notfound__title">이 주소에는 페이지가 없습니다</h1>
      <p className="hint-text">
        주소가 바뀌었거나, 삭제된 배터리 팩일 수 있습니다.
      </p>

      <div className="notfound__actions">
        <Link to="/dashboard" className="btn-primary">
          대시보드로 이동
        </Link>
        <Link to="/" className="btn-ghost">
          홈으로
        </Link>
      </div>
    </div>
  );
}
