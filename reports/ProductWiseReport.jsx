import React, { useEffect } from 'react';
import { useReports } from '@/hooks/useReports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ProductWiseReport = () => {
    const { loading, reportData, fetchProductWise } = useReports();

    useEffect(() => {
        fetchProductWise();
    }, [fetchProductWise]);

    if (loading) {
        return <div className="text-center p-4">Loading report...</div>;
    }

    if (!reportData || reportData.length === 0) {
        return <div className="text-center p-4">No data available.</div>;
    }

    return (
        <div className="w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Total Quantity</TableHead>
                        <TableHead className="text-right">Total Value (with GST)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-center">{item.total_quantity}</TableCell>
                            <TableCell className="text-right">₹{item.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default ProductWiseReport;