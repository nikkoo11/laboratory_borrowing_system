import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  UserCircle, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Lock 
} from 'lucide-react';

export default function UserProfileView() {
  const { user, updateProfile, changePassword } = useAuth();

  // Profile Edit State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        department: department,
      });
      setProfileSuccess('Profile details updated successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setProfileError('Failed to update profile details.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setPasswordError(
        err.response?.data?.current_password?.[0] ||
        err.response?.data?.message ||
        'Error changing password.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <UserCircle className="text-orange-500" size={20} />
          Account & Institutional Profile
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          CSU College of Engineering & Architecture credentials and personal information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Personal Details Form */}
        <div className="p-5 rounded-2xl bg-[#12141c] border border-zinc-800 space-y-3.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
            <UserCircle size={16} className="text-orange-500" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Profile Details
            </h3>
          </div>

          {profileSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{profileSuccess}</span>
            </div>
          )}
          {profileError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Username / ID (Permanent)
              </label>
              <input
                type="text"
                disabled
                value={user?.username || ''}
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Department / Engineering Program
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="pt-1.5">
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm shadow-orange-600/30 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Save size={13} />
                <span>{profileSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="p-5 rounded-2xl bg-[#12141c] border border-zinc-800 space-y-3.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
            <KeyRound size={16} className="text-orange-500" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Security Credentials
            </h3>
          </div>

          {passwordSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle size={14} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="pt-1.5">
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Lock size={13} />
                <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
