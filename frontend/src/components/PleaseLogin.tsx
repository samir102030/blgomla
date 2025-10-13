import React from "react";
import { Link } from "react-router-dom";

const PleaseLogin: React.FC = () => {
  return (
    <div className="text-center py-16">
      <div className="text-gray-400 text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login</h2>
      <p className="text-gray-600 mb-8">
        You need to be logged in to access this page.
      </p>
      <Link
        to="/login"
        className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
      >
        Login
      </Link>
    </div>
  );
};

export default PleaseLogin;
