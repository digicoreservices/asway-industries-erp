import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

export const useReports = () => {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const { toast } = useToast();

    const handleError = useCallback((error, reportName) => {
        console.error(`Error fetching ${reportName} report:`, error);
        toast({
            title: `Error fetching ${reportName} report`,
            description: error.message,
            variant: 'destructive',
        });
        setLoading(false);
    }, [toast]);

    const fetchTotalList = useCallback(async () => {
        setLoading(true);
        setReportData(null);
        const { data, error } = await supabase
            .from('purchase_order_receipts')
            .select('*, customer:customers(customer_name)')
            .order('purchase_order_date', { ascending: false });

        if (error) {
            handleError(error, 'Total List');
        } else {
            setReportData(data);
        }
        setLoading(false);
    }, [handleError]);

    const fetchCustomerWise = useCallback(async () => {
        setLoading(true);
        setReportData(null);
        const { data, error } = await supabase
            .from('purchase_order_receipts')
            .select('grand_total, customer:customers(customer_name)');

        if (error) {
            handleError(error, 'Customer Wise');
        } else {
            const groupedData = data.reduce((acc, receipt) => {
                const customerName = receipt.customer?.customer_name || 'Unknown Customer';
                if (!acc[customerName]) {
                    acc[customerName] = { total: 0, count: 0 };
                }
                acc[customerName].total += receipt.grand_total || 0;
                acc[customerName].count += 1;
                return acc;
            }, {});
            setReportData(Object.entries(groupedData).map(([name, values]) => ({ name, ...values })));
        }
        setLoading(false);
    }, [handleError]);

    const fetchProductWise = useCallback(async () => {
        setLoading(true);
        setReportData(null);
        const { data, error } = await supabase
            .from('purchase_order_receipt_items')
            .select('product_name, description, quantity, total_price_with_gst');

        if (error) {
            handleError(error, 'Product Wise');
        } else {
            const groupedData = data.reduce((acc, item) => {
                const key = `${item.product_name || 'N/A'} - ${item.description || 'N/A'}`;
                if (!acc[key]) {
                    acc[key] = { product_name: item.product_name, description: item.description, total_quantity: 0, total_value: 0 };
                }
                acc[key].total_quantity += item.quantity || 0;
                acc[key].total_value += item.total_price_with_gst || 0;
                return acc;
            }, {});
            setReportData(Object.values(groupedData));
        }
        setLoading(false);
    }, [handleError]);

    const fetchDeliveryWise = useCallback(async () => {
        setLoading(true);
        setReportData(null);
        const { data, error } = await supabase
            .from('purchase_order_receipt_items')
            .select('product_name, description, quantity, delivery_date')
            .order('delivery_date', { ascending: true });

        if (error) {
            handleError(error, 'Delivery Wise');
        } else {
             const groupedData = data.reduce((acc, item) => {
                const date = item.delivery_date ? format(new Date(item.delivery_date), 'dd-MM-yyyy') : 'Unscheduled';
                if (!acc[date]) {
                    acc[date] = [];
                }
                acc[date].push(item);
                return acc;
            }, {});
            setReportData(Object.entries(groupedData).map(([date, items]) => ({ date, items })));
        }
        setLoading(false);
    }, [handleError]);

    const fetchValueWise = useCallback(async () => {
        setLoading(true);
        setReportData(null);
        const { data, error } = await supabase
            .from('purchase_order_receipts')
            .select('order_receipt_id, grand_total, customer:customers(customer_name)');

        if (error) {
            handleError(error, 'Value Wise');
        } else {
            const ranges = {
                'Below ₹1,00,000': (v) => v < 100000,
                '₹1,00,000 - ₹5,00,000': (v) => v >= 100000 && v <= 500000,
                '₹5,00,001 - ₹10,00,000': (v) => v > 500000 && v <= 1000000,
                'Above ₹10,00,000': (v) => v > 1000000,
            };

            const groupedData = Object.keys(ranges).reduce((acc, range) => ({ ...acc, [range]: [] }), {});

            data.forEach(receipt => {
                const value = receipt.grand_total || 0;
                for (const range in ranges) {
                    if (ranges[range](value)) {
                        groupedData[range].push(receipt);
                        break;
                    }
                }
            });

            setReportData(Object.entries(groupedData).map(([range, receipts]) => ({ range, receipts })));
        }
        setLoading(false);
    }, [handleError]);
    
    const fetchUserWise = useCallback(async () => {
        setLoading(true);
        // This is a placeholder as `created_by` column doesn't exist.
        // In a real scenario, you would query receipts and group by user_id.
        setReportData(null); // Set to null to show the message in the component.
        setLoading(false);
    }, []);

    return {
        loading,
        reportData,
        fetchTotalList,
        fetchCustomerWise,
        fetchProductWise,
        fetchDeliveryWise,
        fetchValueWise,
        fetchUserWise,
    };
};