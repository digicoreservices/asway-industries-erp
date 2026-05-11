import React, { useEffect } from 'react';
import { useReports } from '@/hooks/useReports';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserX } from 'lucide-react';

const UserWiseReport = () => {
    const { loading, reportData, fetchUserWise } = useReports();

    useEffect(() => {
        fetchUserWise();
    }, [fetchUserWise]);

    if (loading) {
        return <div className="text-center p-4">Loading...</div>;
    }

    // This component intentionally shows a message because the DB schema is missing a user/creator ID.
    return (
        <div className="p-4">
            <Alert variant="destructive">
                <UserX className="h-4 w-4" />
                <AlertTitle>Feature Not Available</AlertTitle>
                <AlertDescription>
                    The "User Wise" report cannot be generated because the database table for purchase order receipts does not contain a column to identify which user created the record (e.g., `created_by` or `user_id`). Please update the database schema to include this information.
                </AlertDescription>
            </Alert>
        </div>
    );
};

export default UserWiseReport;