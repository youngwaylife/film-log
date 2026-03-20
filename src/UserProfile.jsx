import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Archive from './Archive';
import './UserProfile.css';

const UserProfile = ({ session, targetUserId, targetUsername, onBack }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Follow stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isSelf = session?.user?.id === targetUserId;

  useEffect(() => {
    fetchProfileInfo();
  }, [targetUserId]);

  const fetchProfileInfo = async () => {
    setLoading(true);
    try {
      // 1. Fetch user basically profile info
      const { data: profileErrorData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();
        
      if (profileError) throw profileError;
      setProfileData(profileErrorData);

      // 2. Fetch follower/following counts
      const { count: followers, error: followersErr } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId);
      
      const { count: following, error: followingErr } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);

      if (!followersErr && followers !== null) setFollowersCount(followers);
      if (!followingErr && following !== null) setFollowingCount(following);

      // 3. Check if current user is following this user
      if (session && !isSelf) {
        const { data: followData, error: isFollErr } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', session.user.id)
          .eq('following_id', targetUserId)
          .maybeSingle();

        if (!isFollErr && followData) {
          setIsFollowing(true);
        } else {
          setIsFollowing(false);
        }
      }

    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async () => {
    if (!session || isSelf) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', session.user.id)
          .eq('following_id', targetUserId);
          
        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: session.user.id, following_id: targetUserId }]);
          
        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('팔로우 상태 변경 중 오류가 발생했습니다.');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!profileData) {
    return (
      <div className="user-profile-not-found">
        <h2>User not found</h2>
        <button onClick={onBack} className="back-button">Go Back</button>
      </div>
    );
  }

  return (
    <div className="user-profile-view">
      {onBack && (
        <button onClick={onBack} className="back-button mb-1">
          &larr; Back
        </button>
      )}

      <div className="user-profile-header">
        <div className="user-profile-avatar-container">
          {profileData.avatar_url ? (
            <img src={profileData.avatar_url} alt="Avatar" className="user-profile-avatar" />
          ) : (
            <div className="user-profile-avatar-placeholder">
              {profileData.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="user-profile-info">
          <div className="user-profile-name-row">
            <h2 className="user-profile-username">{profileData.username}</h2>
            {!isSelf && session && (
              <button 
                className={`follow-button ${isFollowing ? 'following' : ''}`}
                onClick={toggleFollow}
                disabled={followLoading}
              >
                {followLoading ? '...' : (isFollowing ? 'Unfollow' : 'Follow')}
              </button>
            )}
          </div>
          
          <div className="user-profile-stats">
            <span><strong>{followersCount}</strong> Followers</span>
            <span><strong>{followingCount}</strong> Following</span>
          </div>

          {profileData.bio && <p className="user-profile-bio">{profileData.bio}</p>}
        </div>
      </div>

      <hr className="profile-divider" />

      {/* Reusing Archive component to show this user's logs */}
      <Archive 
        session={session} 
        username={profileData.username} 
        targetUserId={targetUserId} 
      />
    </div>
  );
};

export default UserProfile;
