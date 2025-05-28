import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { QrCode, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TwoFactorSetup() {
  const { setup2FA, verify2FA, disable2FA, user } = useAuth();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    try {
      setLoading(true);
      const response = await setup2FA();
      setQrCode(response.qrCode);
      setSecret(response.secret);
    } catch (error) {
      toast.error('Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await verify2FA(verificationCode);
      toast.success('2FA enabled successfully!');
    } catch (error) {
      toast.error('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    try {
      setLoading(true);
      await disable2FA();
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      toast.success('2FA disabled successfully!');
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Two-Factor Authentication</h2>
          <p className="text-gray-400 mt-2">
            Enhance your account security with 2FA
          </p>
        </div>

        {user?.isTwoFactorEnabled ? (
          <div className="text-center">
            <div className="bg-green-500/20 text-green-400 p-4 rounded-lg mb-6 flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              2FA is currently enabled
            </div>
            <button
              onClick={handleDisable}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Disable 2FA
            </button>
          </div>
        ) : (
          <div>
            {!qrCode ? (
              <button
                onClick={handleSetup}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                Setup 2FA
              </button>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="mx-auto mb-4"
                  />
                  <p className="text-sm text-gray-400 mb-2">
                    Scan this QR code with your authenticator app
                  </p>
                  <p className="text-xs text-gray-500 break-all">
                    Or manually enter this code: {secret}
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label htmlFor="verification-code" className="block text-sm font-medium text-gray-400 mb-2">
                      Enter Verification Code
                    </label>
                    <input
                      type="text"
                      id="verification-code"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
                  >
                    Verify & Enable 2FA
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li>Download Google Authenticator app</li>
            <li>Click "Setup 2FA" to generate a QR code</li>
            <li>Scan the QR code with your authenticator app</li>
            <li>Enter the 6-digit code from your app to verify</li>
          </ol>
        </div>
      </div>
    </div>
  );
}