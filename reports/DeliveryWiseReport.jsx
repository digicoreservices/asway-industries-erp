import React, { useEffect } from 'react';
import { useReports } from '@/hooks/useReports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DeliveryWiseReport = () => {
    const { loading, reportData, fetchDeliveryWise } = useReports();

    useEffect(() => {
        fetchDeliveryWise();
    }, [fetchDeliveryWise]);

    if (loading) {
        return <div className="text-center p-4">Loading report...</div>;
    }

    if (!reportData || reportData.length === 0) {
        return <div className="text-center p-4">No data available.</div>;
    }

    return (
        <div className="space-y-4">
            {reportData.map(({ date, items }) => (
                <Card key={date}>
                    <CardHeader>
                        <CardTitle>Delivery Date: {date}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.product_name}</TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default DeliveryWiseReport;