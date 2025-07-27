import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase'; // adjust path if needed

export default function Profile() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log('No user logged in');
        return;
      }

      const userId = session.user.id;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setUserData(data);
    }

    fetchUser();
  }, []);

  if (!userData) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {userData.first_name}!</h1>
      <p>Email: {userData.email}</p>
      {/* Display other user info */}
    </div>
  );
}
