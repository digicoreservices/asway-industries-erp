import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { INITIAL_CATEGORY_LIST, INITIAL_UNIT_LIST, INITIAL_ITEM_MAP } from '@/lib/productConstants';

const useProductList = () => {
  const [categoryList, setCategoryList] = useState(INITIAL_CATEGORY_LIST);
  const [unitList, setUnitList] = useState(INITIAL_UNIT_LIST);
  const [itemMap, setItemMap] = useState(INITIAL_ITEM_MAP);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('product_list').select('product_name, type');
      if (error) throw error;

      if (data) {
        const newMap = JSON.parse(JSON.stringify(INITIAL_ITEM_MAP)); // Deep copy initial map
        const newCategories = new Set(INITIAL_CATEGORY_LIST);
        const newUnits = new Set(INITIAL_UNIT_LIST);

        data.forEach(item => {
          if (item.type === 'UNIT') {
            newUnits.add(item.product_name);
          } else {
            const cat = item.type;
            const prod = item.product_name;

            if (cat) {
              newCategories.add(cat);
              if (!newMap[cat]) newMap[cat] = [];
              // Prevent duplicates and ignore initialization placeholder
              if (prod && prod !== '_init_' && !newMap[cat].includes(prod)) {
                newMap[cat].push(prod);
              }
            }
          }
        });

        setCategoryList(Array.from(newCategories));
        setUnitList(Array.from(newUnits));
        setItemMap(newMap);
      }
    } catch (err) {
      console.error("Failed to load product list:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    categoryList,
    unitList,
    itemMap,
    fetchProducts,
    loading
  };
};

export default useProductList;