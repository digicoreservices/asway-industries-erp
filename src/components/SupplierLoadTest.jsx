import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, RefreshCw } from 'lucide-react';

const SupplierLoadTest = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      console.log("[SupplierLoadTest] Executing direct Supabase query...");
      const { data: result, error: fetchError } = await supabase
        .from('suppliers')
        .select('*')
        .limit(5);

      if (fetchError) {
        console.error("[SupplierLoadTest] Supabase Error:", fetchError);
        setError(fetchError);
      } else {
        console.log("[SupplierLoadTest] Query Success, data:", result);
        setData(result);
      }
    } catch (err) {
      console.error("[SupplierLoadTest] Exception caught:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Supplier Load Diagnostic Test</CardTitle>
          <Button onClick={testConnection} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Test Again
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-100 p-4 rounded-md">
            <h3 className="font-semibold mb-2 text-sm text-slate-500">Query Executed:</h3>
            <code className="text-xs">supabase.from('suppliers').select('*').limit(5)</code>
          </div>

          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-800 overflow-auto">
              <h3 className="font-bold text-red-900 mb-2">Error Encountered:</h3>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}

          {data && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-md text-green-900 overflow-auto">
              <h3 className="font-bold text-green-900 mb-2">Success! Data Retrieved ({data.length} records):</h3>
              {data.length === 0 ? (
                <p className="text-sm italic">The 'suppliers' table exists but is currently empty.</p>
              ) : (
                <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierLoadTest;