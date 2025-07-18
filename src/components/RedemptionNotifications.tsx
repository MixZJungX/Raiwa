import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RedemptionRequest, RedemptionCode } from '@/types';

type RedemptionInfo = {
  username: string;
  date: string;
  robuxValue: number;
  animationIndex: number;
};

export function RedemptionNotifications() {
  const [notifications, setNotifications] = useState<RedemptionInfo[]>([]);
  const [completedRequests, setCompletedRequests] = useState<RedemptionRequest[]>([]);
  const [codeValues, setCodeValues] = useState<Record<string, number>>({});

  // Fetch completed redemption requests
  useEffect(() => {
    const fetchCompletedRedemptions = async () => {
      try {
        const { data, error } = await supabase
          .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_requests")
          .select("*")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(10);
          
        if (error) {
          console.error("Error fetching completed redemptions:", error);
        } else if (data) {
          setCompletedRequests(data);
          
          // Get all unique codes
          const codes = data.map(req => req.code);
          
          // Fetch code values
          const { data: codeData, error: codeError } = await supabase
            .from("app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_codes")
            .select('code, value')
            .in('code', codes);
            
          if (codeError) {
            console.error("Error fetching code values:", codeError);
          } else if (codeData) {
            // Create a map of code to value
            const valuesMap: Record<string, number> = {};
            codeData.forEach(item => {
              valuesMap[item.code] = item.value;
            });
            setCodeValues(valuesMap);
          }
        }
      } catch (error) {
        console.error("Error in fetchCompletedRedemptions:", error);
      }
    };

    fetchCompletedRedemptions();
    
    // Set up real-time subscription for new completed redemptions
    const subscription = supabase
      .channel('redemption-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'app_9c8f2cf91bf942b2a7f12fc4c7ee9dc6_redemption_requests',
        filter: 'status=eq.completed'
      }, fetchCompletedRedemptions)
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Process redemption data into notification format
  useEffect(() => {
    if (completedRequests.length > 0 && Object.keys(codeValues).length > 0) {
      const newNotifications: RedemptionInfo[] = completedRequests.map((req, index) => ({
        username: req.roblox_username,
        date: new Date(req.created_at).toLocaleDateString('th-TH'),
        robuxValue: codeValues[req.code] || 0,
        animationIndex: index % 3 // Use modulo to alternate between 3 animation positions
      }));
      
      setNotifications(newNotifications);
    }
  }, [completedRequests, codeValues]);

  // Auto-rotate through notifications
  useEffect(() => {
    if (notifications.length <= 1) return;

    const interval = setInterval(() => {
      setNotifications(prev => {
        const updated = [...prev];
        const first = updated.shift();
        if (first) updated.push(first);
        return updated;
      });
    }, 5000); // Rotate every 5 seconds
    
    return () => clearInterval(interval);
  }, [notifications.length]);

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.slice(0, 3).map((notification, index) => (
        <div 
          key={`${notification.username}-${index}`}
          className="notification"
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg 
                        flex flex-col w-[300px] animate-pulse-subtle">
            <div className="flex items-center justify-between">
              <span className="text-xs bg-white text-blue-800 px-2 py-0.5 rounded-full font-medium">
                {notification.robuxValue} Robux
              </span>
              <span className="text-xs opacity-80">
                {notification.date}
              </span>
            </div>
            <div className="font-semibold mt-1 text-sm">
              {notification.username}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}