import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { generateAllSections, saveAccountSections } from '../lib/api';

export function useAccounts(userId) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const fetchAccounts = useCallback(async () => {
    if (!userId) { setAccounts([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*, account_sections(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const shaped = (data || []).map((acc) => ({
        ...acc,
        content: Object.fromEntries(
          (acc.account_sections || []).map((s) => [s.section_type, s.content])
        ),
      }));

      setAccounts(shaped);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /**
   * Create a new account, generate all 8 sections in parallel,
   * save to Supabase, and update local state.
   *
   * @param {Object} formData - { companyName, contactName, contactRole, industry }
   * @param {Object} userProfile - from useAuthContext().profile
   * @param {Function} onSectionComplete - called with (sectionType) as each section finishes
   */
  const createAccount = useCallback(async (formData, userProfile, onSectionComplete) => {
    if (!userId) throw new Error('Not authenticated');

    // 1. Insert the account row
    const { data: accountRow, error: insertError } = await supabase
      .from('accounts')
      .insert({
        user_id: userId,
        company_name: formData.companyName,
        contact_name: formData.contactName || '',
        contact_role: formData.contactRole || '',
        industry: formData.industry || '',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Build generation params from form + user profile
    const params = {
      companyName: formData.companyName,
      contactName: formData.contactName || '[First Name]',
      contactRole: formData.contactRole || '[Title]',
      industry: formData.industry || 'Technology',
      ourCompany: userProfile?.company_name || 'Our Company',
      userRole: userProfile?.user_role || 'Sales Representative',
      valueProposition: userProfile?.value_proposition || 'innovative solutions',
    };

    // 3. Generate all sections in parallel
    const contentMap = await generateAllSections(params, (sectionType) => {
      if (onSectionComplete) onSectionComplete(sectionType);
    });

    // 4. Save all sections to Supabase
    await saveAccountSections(accountRow.id, contentMap);

    // 5. Build the complete account and update local state
    const completeAccount = { ...accountRow, content: contentMap };
    setAccounts((prev) => [completeAccount, ...prev]);
    setSelectedAccount(completeAccount);

    return completeAccount;
  }, [userId]);

  const deleteAccount = useCallback(async (accountId) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;

    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    if (selectedAccount?.id === accountId) setSelectedAccount(null);
  }, [selectedAccount]);

  return {
    accounts,
    loading,
    selectedAccount,
    setSelectedAccount,
    createAccount,
    deleteAccount,
    refetch: fetchAccounts,
  };
}
