import React, { useEffect } from 'react';
import { useReports } from '@/hooks/useReports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ValueWiseReport = () => {
    const { loading, reportData, fetchValueWise } = useReports();

    useEffect(() => {
        fetchValueWise();
    }, [fetchValueWise]);

    if (loading) {
        return <div className="text-center p-4">Loading report...</div>;
    }

    if (!reportData || reportData.length === 0) {
        return <div className="text-center p-4">No data available.</div>;
    }

    return (
        <div className="space-y-4">
            {reportData.map(({ range, receipts }) => (
                receipts.length > 0 && (
                    <Card key={range}>
                        <CardHeader>
                            <CardTitle>Value Range: {range} ({receipts.length} Orders)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>PO Receipt No.</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {receipts.map((receipt) => (
                                        <TableRow key={receipt.order_receipt_id}>
                                            <TableCell>{receipt.order_receipt_id}</TableCell>
                                            <TableCell>{receipt.customer?.customer_name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">₹{receipt.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )
            ))}
        </div>
    );
};

export default ValueWiseReport;