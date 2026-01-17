import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUserStore } from "../stores/user.store";
import { useTranslation } from "react-i18next";

// const LoginRegisterPage: React.FC = () => {

const LoginRegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const navigate = useNavigate();
  const login = useUserStore((s) => s.login);
  const signup = useUserStore((s) => s.signup);
  const loading = useUserStore((s) => s.loading);
  const error = useUserStore((s) => s.error);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const user = await login({
        email: loginData.email,
        password: loginData.password,
      });
      if (user) {
        navigate("/");
      } else {
        setLoginError(error || t("Login failed."));
      }
    } catch (err: any) {
      setLoginError(error || t("Login failed."));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError(t("Passwords do not match."));
      return;
    }
    try {
      const user = await signup({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
      });
      if (user) {
        navigate("/");
      } else {
        setRegisterError(error || "Registration failed.");
      }
    } catch (err: any) {
      setRegisterError(error || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-[#002B5B] to-[#004080] text-white py-8 sm:py-12 lg:py-16">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">
            {t("Login & Register")}
          </h1>
          <nav className="text-xs sm:text-sm opacity-90">
            <Link to="/" className="hover:opacity-100">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>{t("Login & Register")}</span>
          </nav>
        </div>
      </div>

      <main className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
            {/* Login Form */}
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                {t("Already a Member?")}
              </h2>

              <form
                onSubmit={handleLoginSubmit}
                className="space-y-3 sm:space-y-4 lg:space-y-6"
              >
                <div>
                  <input
                    type="email"
                    placeholder={t("Email or Username")}
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder={t("Password")}
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                {loginError && (
                  <div className="text-red-600 text-xs sm:text-sm">
                    {loginError}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-black text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-800 transition-colors disabled:opacity-60"
                  disabled={loginLoading}
                >
                  {loginLoading ? t("Logging in...") : t("LOGIN")}
                </button>
              </form>

              <div className="mt-4 sm:mt-6 text-center">
                <Link
                  to="/forgot-password"
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800"
                >
                  {t("Forgot your password?")}
                </Link>
              </div>
            </div>

            {/* Register Form */}
            <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                {t("Register Form")}
              </h2>

              <form
                onSubmit={handleRegisterSubmit}
                className="space-y-3 sm:space-y-4 lg:space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                  <div>
                    <input
                      type="text"
                      placeholder={t("Name")}
                      value={registerData.name}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder={t("Enter your email")}
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                  <div>
                    <input
                      type="password"
                      placeholder={t("Password")}
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder={t("Repeat Password")}
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                {registerError && (
                  <div className="text-red-600 text-xs sm:text-sm">
                    {registerError}
                  </div>
                )}
                {registerSuccess && (
                  <div className="text-green-600 text-xs sm:text-sm">
                    {registerSuccess}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-black text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-medium text-sm sm:text-base hover:bg-gray-800 transition-colors disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? t("Registering...") : t("REGISTER")}
                </button>
              </form>

              <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-600">
                {t("By registering, you agree to our")}{" "}
                <Link to="/terms" className="text-blue-600 hover:text-blue-800">
                  {t("Terms & Conditions")}
                </Link>{" "}
                {t("and")}{" "}
                <Link
                  to="/privacy"
                  className="text-blue-600 hover:text-blue-800"
                >
                  {t("Privacy Policy")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginRegisterPage;
