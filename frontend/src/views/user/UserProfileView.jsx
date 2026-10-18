import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Alert from '../../components/Alert';
import { UserCircle, KeyRound, Save, Lock } from 'lucide-react';

export default function UserProfileView() {
  const { user, updateProfile, changePassword } = useAuth();

  const [firstName,   setFirstName]   = useState(user?.first_name  || '');
  const [lastName,    setLastName]    = useState(user?.last_name   || '');
  const [department,  setDepartment]  = useState(user?.department  || '');
  const [profileSaving,  setProfileSaving]  = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError,   setProfileError]   = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving,  setPasswordSaving]  = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError,   setPasswordError]   = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      await updateProfile({ first_name: firstName, last_name: lastName, department });
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
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');
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

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-slate-400 bg-white';
  const disabledCls = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-400 text-xs bg-slate-50 cursor-not-allowed';
  const labelCls = 'block text-xs font-medium text-slate-700 mb-1';

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Account &amp; Institutional Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          CSU College of Engineering &amp; Architecture credentials and personal information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Profile Details */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center">
              <UserCircle size={17} />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Profile Details</h3>
          </div>

          <Alert type="success" message={profileSuccess} />
          <Alert type="error"   message={profileError}   />

          <form onSubmit={handleProfileSubmit} className="space-y-3.5">
            <div>
              <label className={labelCls}>Username / ID (Permanent)</label>
              <input type="text" disabled value={user?.username || ''} className={disabledCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First Name</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Department / Engineering Program</label>
              <input type="text" required value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full py-2.5 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>{profileSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Security Credentials */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center">
              <KeyRound size={17} />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Security Credentials</h3>
          </div>

          <Alert type="success" message={passwordSuccess} />
          <Alert type="error"   message={passwordError}   />

          <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
            {[
              { label: 'Current Password *', value: currentPassword, onChange: setCurrentPassword },
              { label: 'New Password *',     value: newPassword,     onChange: setNewPassword },
              { label: 'Confirm Password *', value: confirmPassword, onChange: setConfirmPassword },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className={labelCls}>{label}</label>
                <input type="password" required value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••" className={inputCls} />
              </div>
            ))}

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Lock size={14} />
                <span>{passwordSaving ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

