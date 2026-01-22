import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'customer' | 'salon_owner' | null;

export const useUserRole = () => {
    const { user, loading: authLoading } = useAuth();
    const [role, setRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                if (!user) {
                    setRole(null);
                    setLoading(false);
                    return;
                }

                // Check if user is a barber (Salon Owner)
                const { data: barber, error: barberError } = await supabase
                    .from('barbers')
                    .select('id')
                    .eq('owner_id', user.id)
                    .maybeSingle();

                if (barberError) throw barberError;

                if (barber) {
                    setRole('salon_owner');
                } else {
                    // Check if user has a profile (Customer)
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profileError) throw profileError;

                    if (profile) {
                        setRole('customer');
                    } else {
                        console.error('User authenticated but has no profile');
                        setRole(null); // No role
                    }
                }
            } catch (err: any) {
                console.error('Error fetching role:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchRole();
        }
    }, [user, authLoading]);

    return { role, loading: loading || authLoading, error };
};
