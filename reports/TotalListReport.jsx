import React, { useEffect } from 'react';
import { useReports } from '@/hooks/useReports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { format } from 'date-fns';

const TotalListReport = () => {
    const { loading, reportData, fetchTotalList } = useReports();

    useEffect(() => {
        fetchTotalList();
    }, [fetchTotalList]);

    if (loading) {
        return <div className="text-center p-4">Loading report...</div>;
    }

    if (!reportData || reportData.length === 0) {
        return <div className="text-center p-4">No data available.</div>;
    }
    
    const grandTotalSum = reportData.reduce((sum, receipt) => sum + (receipt.grand_total || 0), 0);

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>PO Date</TableHead>
                        <TableHead>PO Receipt No.</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Grand Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map((receipt) => (
                        <TableRow key={receipt.id}>
                            <TableCell>{receipt.purchase_order_date ? format(new Date(receipt.purchase_order_date), 'dd-MM-yyyy') : 'N/A'}</TableCell>
                            <TableCell>{receipt.order_receipt_id}</TableCell>
                            <TableCell>{receipt.customer?.customer_name || 'N/A'}</TableCell>
                            <TableCell className="text-right">₹{receipt.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                 <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">₹{grandTotalSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </div>
    );
};

export default TotalListReport;