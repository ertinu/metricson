// Login sayfası - Kullanıcı girişi ve şifre sıfırlama
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({ username: '', email: '' });
  const [resetPasswordData, setResetPasswordData] = useState({ token: '', newPassword: '', confirmPassword: '' });
  const [forgotPasswordStep, setForgotPasswordStep] = useState('request'); // 'request' veya 'reset'
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const { login, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Giriş yapılırken bir hata oluştu.');
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');
    
    const result = await forgotPassword(forgotPasswordData.username, forgotPasswordData.email);
    
    if (result.success) {
      setForgotPasswordMessage('Şifre sıfırlama bağlantısı oluşturuldu. Token: ' + result.resetToken);
      setForgotPasswordStep('reset');
    } else {
      setForgotPasswordMessage(result.error || 'Bir hata oluştu.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage('');

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setForgotPasswordMessage('Şifreler eşleşmiyor.');
      return;
    }

    if (resetPasswordData.newPassword.length < 6) {
      setForgotPasswordMessage('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    const result = await resetPassword(resetPasswordData.token, resetPasswordData.newPassword);
    
    if (result.success) {
      setForgotPasswordMessage('Şifre başarıyla değiştirildi. Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep('request');
        setResetPasswordData({ token: '', newPassword: '', confirmPassword: '' });
      }, 2000);
    } else {
      setForgotPasswordMessage(result.error || 'Bir hata oluştu.');
    }
  };

  if (showForgotPassword) {
    return (
      <div className="bg-background-light font-display text-text-dark min-h-screen overflow-hidden">
        <div className="flex h-screen w-full flex-row">
          {/* Sol Panel - Forgot Password Form */}
          <div className="flex w-full flex-col justify-center overflow-y-auto px-6 py-12 lg:w-[45%] xl:w-[40%] xl:px-20 2xl:px-32">
            <div className="flex flex-col w-full max-w-md mx-auto">
              {/* Logo */}
              <div className="mb-12 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                  <span className="material-symbols-outlined text-[24px]">token</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-text-dark">Metric AI</span>
              </div>

              {/* Başlık */}
              <div className="mb-8">
                <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-text-dark md:text-5xl">
                  {forgotPasswordStep === 'request' ? 'Reset Password' : 'New Password'}
                </h1>
                <p className="mt-3 text-base font-normal leading-normal text-text-medium">
                  {forgotPasswordStep === 'request' 
                    ? 'Enter your username to receive a reset token.'
                    : 'Enter your token and new password to reset.'}
                </p>
              </div>

              {/* Form */}
              {forgotPasswordStep === 'request' ? (
                <form onSubmit={handleForgotPasswordRequest} className="flex flex-col gap-5">
                  {/* Kullanıcı Adı */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium leading-normal text-text-dark" htmlFor="forgot-username">
                      Username
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light bg-surface-light focus:border-primary h-14 placeholder:text-text-light pl-12 pr-4 text-base font-normal leading-normal transition-all duration-200"
                        id="forgot-username"
                        placeholder="Enter your username"
                        type="text"
                        value={forgotPasswordData.username}
                        onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, username: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* E-posta */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium leading-normal text-text-dark" htmlFor="forgot-email">
                      E-posta (Opsiyonel)
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                        <span className="material-symbols-outlined text-[20px]">email</span>
                      </div>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light bg-surface-light focus:border-primary h-14 placeholder:text-text-light pl-12 pr-4 text-base font-normal leading-normal transition-all duration-200"
                        id="forgot-email"
                        placeholder="Enter your email (optional)"
                        type="email"
                        value={forgotPasswordData.email}
                        onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Mesaj */}
                  {forgotPasswordMessage && (
                    <div className={`p-3 rounded-xl text-sm ${forgotPasswordMessage.includes('Token') ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
                      {forgotPasswordMessage}
                    </div>
                  )}

                  {/* Butonlar */}
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordStep('request');
                        setForgotPasswordMessage('');
                      }}
                      className="flex-1 px-4 py-3 border border-border-light rounded-full hover:bg-gray-50 transition-colors text-text-dark font-medium"
                    >
                      Geri
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-primary text-white rounded-full hover:bg-red-600 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 font-bold"
                    >
                      Token Oluştur
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                  {/* Token */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium leading-normal text-text-dark" htmlFor="reset-token">
                      Token
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                        <span className="material-symbols-outlined text-[20px]">key</span>
                      </div>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light bg-surface-light focus:border-primary h-14 placeholder:text-text-light pl-12 pr-4 text-base font-normal leading-normal transition-all duration-200"
                        id="reset-token"
                        placeholder="Enter your reset token"
                        type="text"
                        value={resetPasswordData.token}
                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, token: e.target.value })}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Yeni Şifre */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium leading-normal text-text-dark" htmlFor="new-password">
                      Yeni Şifre
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                        <span className="material-symbols-outlined text-[20px]">lock</span>
                      </div>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light bg-surface-light focus:border-primary h-14 placeholder:text-text-light pl-12 pr-4 text-base font-normal leading-normal transition-all duration-200"
                        id="new-password"
                        placeholder="Enter new password"
                        type="password"
                        value={resetPasswordData.newPassword}
                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Yeni Şifre (Tekrar) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-base font-medium leading-normal text-text-dark" htmlFor="confirm-password">
                      Yeni Şifre (Tekrar)
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                        <span className="material-symbols-outlined text-[20px]">lock</span>
                      </div>
                      <input
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light bg-surface-light focus:border-primary h-14 placeholder:text-text-light pl-12 pr-4 text-base font-normal leading-normal transition-all duration-200"
                        id="confirm-password"
                        placeholder="Confirm new password"
                        type="password"
                        value={resetPasswordData.confirmPassword}
                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Mesaj */}
                  {forgotPasswordMessage && (
                    <div className={`p-3 rounded-xl text-sm ${forgotPasswordMessage.includes('başarıyla') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {forgotPasswordMessage}
                    </div>
                  )}

                  {/* Butonlar */}
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordStep('request');
                        setForgotPasswordMessage('');
                      }}
                      className="flex-1 px-4 py-3 border border-border-light rounded-full hover:bg-gray-50 transition-colors text-text-dark font-medium"
                    >
                      Geri
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-primary text-white rounded-full hover:bg-red-600 hover:shadow-lg hover:shadow-primary/20 transition-all duration-200 font-bold"
                    >
                      Şifreyi Değiştir
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Sağ Panel - Görsel */}
          <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative p-4 pl-0 h-screen">
            <div className="h-full w-full rounded-l-[3rem] overflow-hidden relative shadow-xl ring-1 ring-border-light">
              <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-purple-50"></div>
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
                style={{
                  backgroundImage: `url('/login-back.jpg')`,
                  backgroundPosition: 'center 20%'
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-background-light/80 via-background-light/30 to-transparent"></div>

              {/* Alt Metin */}
              <div className="absolute bottom-0 left-0 w-full p-16">
                <div className="max-w-2xl">
                  <div className="mb-6 inline-flex items-center rounded-lg bg-surface-light/50 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm border border-border-light">
                    <span className="material-symbols-outlined mr-2 text-[18px]">auto_awesome</span>
                    Intelligence Amplified
                  </div>
                  <h2 className="text-5xl font-black text-text-dark leading-[1.1] mb-6 tracking-tight">
                    Secure your access <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-text-dark to-text-medium">
                      with confidence.
                    </span>
                  </h2>
                  <p className="text-lg text-text-medium font-normal leading-relaxed max-w-lg">
                    Reset your password securely and regain access to your personalized workspace.
                  </p>
                  <div className="flex gap-2 mt-8">
                    <div className="h-1.5 w-8 rounded-full bg-primary"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-text-light/40"></div>
                    <div className="h-1.5 w-1.5 rounded-full bg-text-light/40"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light font-display text-text-dark min-h-screen overflow-hidden">
      <div className="flex h-screen w-full flex-row">
        {/* Sol Panel - Login Form */}
        <div className="flex w-full flex-col justify-center overflow-y-auto px-6 py-12 lg:w-[45%] xl:w-[40%] xl:px-20 2xl:px-32">
          <div className="flex flex-col w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="mb-12 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
                <span className="material-symbols-outlined text-[24px]">token</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-text-dark">Metric AI</span>
            </div>

            {/* Başlık */}
            <div className="mb-8">
              <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-text-dark md:text-5xl">
                Welcome Back
              </h1>
              <p className="mt-3 text-base font-normal leading-normal text-text-medium">
                Please enter your details to access the portal.
              </p>
            </div>

            {/* Login Form */}
            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              {/* Kullanıcı Adı */}
              <div className="flex flex-col gap-2">
                <label className="text-base font-medium leading-normal text-text-dark" htmlFor="username">
                  Username
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light bg-surface-light focus:border-primary h-14 placeholder:text-text-light pl-12 pr-4 text-base font-normal leading-normal transition-all duration-200"
                    id="username"
                    placeholder="Enter your username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Şifre */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium leading-normal text-text-dark" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light transition-colors group-focus-within:text-primary">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-text-dark focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-border-light bg-surface-light focus:border-primary h-14 placeholder:text-text-light pl-12 pr-12 text-base font-normal leading-normal transition-all duration-200"
                    id="password"
                    placeholder="Enter your password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-light hover:text-text-dark transition-colors cursor-pointer"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me ve Forgot Password */}
              <div className="flex items-center justify-between mt-1">
                <label className="flex gap-x-3 py-1 flex-row cursor-pointer group select-none">
                  <input
                    className="h-5 w-5 rounded border-border-light border-2 bg-transparent text-primary checked:bg-primary checked:border-primary focus:ring-0 focus:ring-offset-0 focus:border-primary focus:outline-none transition-colors"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <p className="text-text-medium text-sm font-normal leading-normal group-hover:text-text-dark transition-colors">
                    Remember for 30 days
                  </p>
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:text-red-600 hover:underline"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>

              {/* Hata Mesajı */}
              {error && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Login Butonu */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-red-600 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">{loading ? 'Logging in...' : 'Log In'}</span>
              </button>

              {/* Varsayılan Kullanıcı Bilgisi */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-border-light">
                <p className="text-xs text-text-medium text-center">
                  Varsayılan kullanıcı: <span className="font-mono font-semibold text-text-dark">admin</span> / <span className="font-mono font-semibold text-text-dark">123456</span>
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Sağ Panel - Görsel */}
        <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative p-4 pl-0 h-screen">
          <div className="h-full w-full rounded-l-[3rem] overflow-hidden relative shadow-xl ring-1 ring-border-light">
            <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50 to-purple-50"></div>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
              style={{
                backgroundImage: `url('/login-back.jpg')`,
                backgroundPosition: 'center 20%'
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background-light/80 via-background-light/30 to-transparent"></div>

            {/* Alt Metin */}
            <div className="absolute bottom-0 left-0 w-full p-16">
              <div className="max-w-2xl">
                <div className="mb-6 inline-flex items-center rounded-lg bg-surface-light/50 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm border border-border-light">
                  <span className="material-symbols-outlined mr-2 text-[18px]">auto_awesome</span>
                  Intelligence Amplified
                </div>
                <h2 className="text-5xl font-black text-text-dark leading-[1.1] mb-6 tracking-tight">
                Analyze your metrics with AI-driven precision.
 <br/>
               
                </h2>
                <p className="text-lg text-text-medium font-normal leading-relaxed max-w-lg">
                AI-powered metric analysis at your fingertips.
                </p>
                <div className="flex gap-2 mt-8">
                  <div className="h-1.5 w-8 rounded-full bg-primary"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-text-light/40"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-text-light/40"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
