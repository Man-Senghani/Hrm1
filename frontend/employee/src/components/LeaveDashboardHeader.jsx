import React, { useState, useEffect } from 'react';

const LeaveDashboardHeader = ({ userName }) => {
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
      setCurrentTime(new Date());
    };

    updateGreeting();
    const timer = setInterval(updateGreeting, 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-indigo-950 dark:text-white tracking-tight leading-none mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          {greeting}, {userName}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">
          Here's the leave management overview for your organization.
        </p>
      </div>
    </div>
  );
};

export default LeaveDashboardHeader;
