import React, { useEffect } from 'react';
import { useReports } from '@/hooks/useReports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';

const CustomerWiseReport = () => {
    const { loading, reportData, fetchCustomerWise } = useReports();

    useEffect(() => {
        fetchCustomerWise();
    }, [fetchCustomerWise]);

    if (loading) {
        return <div className="text-center p-4">Loading report...</div>;
    }

    if (!reportData || reportData.length === 0) {
        return <div className="text-center p-4">No data available.</div>;
    }

    const totalValue = reportData.reduce((sum, customer) => sum + customer.total, 0);

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead className="text-center">Order Count</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map((customer) => (
                        <TableRow key={customer.name}>
                            <TableCell>{customer.name}</TableCell>
                            <TableCell className="text-center">{customer.count}</TableCell>
                            <TableCell className="text-right">₹{customer.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
};

export default CustomerWiseReport;