export const formatDate = (dateString) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleString();
};

export const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`;
  return 'Just now';
};

export const formatTimeUntil = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const seconds = Math.floor((date - Date.now()) / 1000);
  if (seconds <= 0) return 'Now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `in ${hours}h ${minutes}m`;
  }
  return `in ${minutes} minutes`;
};
