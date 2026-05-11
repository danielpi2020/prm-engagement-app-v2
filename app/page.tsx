'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Engagement = {
  id: number;
  activity_date: string | null;
  activity_year: number | null;
  subject: string | null;
  account_name: string | null;
  notes: string | null;
  notes_plain_text: string | null;
  external_attendees: string | null;
  internal_attendees: string | null;
  type_name: string | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) return 'No date';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function HomePage() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState('2026');
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingEngagements, setLoadingEngagements] = useState(false);

  useEffect(() => {
    async function fetchAccounts() {
      setLoadingAccounts(true);

      const query1 = await supabase
        .from('unique_accounts')
        .select('account_name')
        .order('account_name', { ascending: true })
        .range(0, 999);

      const query2 = await supabase
        .from('unique_accounts')
        .select('account_name')
        .order('account_name', { ascending: true })
        .range(1000, 1999);

      const combinedData = [
        ...(query1.data || []),
        ...(query2.data || []),
      ];

      const combinedError = query1.error || query2.error;

      if (combinedError) {
        console.error('Error loading accounts:', combinedError);
        setLoadingAccounts(false);
        return;
      }

      const uniqueAccounts = Array.from(
        new Set(
          combinedData
            .map((row) => row.account_name)
            .filter((name): name is string => Boolean(name))
        )
      ).sort((a, b) => a.localeCompare(b));

      setAccounts(uniqueAccounts);
      setLoadingAccounts(false);
    }

    fetchAccounts();
  }, []);

  useEffect(() => {
    async function loadEngagements() {
      if (!selectedAccount) {
        setEngagements([]);
        return;
      }

      setLoadingEngagements(true);

      let query = supabase
        .from('engagements')
        .select(`
          id,
          activity_date,
          activity_year,
          subject,
          account_name,
          notes,
          notes_plain_text,
          external_attendees,
          internal_attendees,
          type_name
        `)
        .eq('account_name', selectedAccount)
        .order('activity_date', { ascending: false });

      if (yearFilter !== 'all') {
        query = query.eq('activity_year', Number(yearFilter));
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading engagements:', error);
        setEngagements([]);
      } else {
        setEngagements(data || []);
      }

      setLoadingEngagements(false);
    }

    loadEngagements();
  }, [selectedAccount, yearFilter]);

  const filteredAccounts = accountSearch
    ? accounts
        .filter((account) =>
          account.toLowerCase().includes(accountSearch.toLowerCase())
        )
        .slice(0, 20)
    : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">
          PRM Engagement Timeline
        </h1>

        <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow-sm md:grid-cols-2">
          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-black">
              Select account
            </label>
            {loadingAccounts ? (
              <p className="text-sm text-black">Loading accounts...</p>
            ) : (
              <div className="relative">
                <input
                  value={accountSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAccountSearch(value);
                    if (value !== selectedAccount) {
                      setSelectedAccount('');
                    }
                  }}
                  onFocus={() => setAccountDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setAccountDropdownOpen(false), 150)
                  }
                  className="w-full rounded-lg border border-gray-300 p-3"
                  placeholder="Search accounts"
                />
                {accountDropdownOpen && accountSearch && (
                  <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map((account) => (
                        <button
                          key={account}
                          type="button"
                          onMouseDown={() => {
                            setSelectedAccount(account);
                            setAccountSearch(account);
                            setAccountDropdownOpen(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-black hover:bg-gray-100"
                        >
                          {account}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No matching accounts
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black">
              Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>

        {selectedAccount && (
          <div className="mb-4 text-sm text-black">
            Showing results for{' '}
            <span className="font-semibold">{selectedAccount}</span>
          </div>
        )}

        {loadingEngagements ? (
          <p className="text-black">Loading timeline...</p>
        ) : engagements.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow-sm text-black">
            {selectedAccount
              ? 'No engagements found for this selection.'
              : 'Select an account to view engagement history.'}
          </div>
        ) : (
          <div className="space-y-4">
            {engagements.map((item) => {
              const noteContent =
                item.notes_plain_text || item.notes || 'No notes available';

              return (
                <section
                  key={item.id}
                  className="rounded-xl bg-white p-5 shadow-sm"
                >
                  <h2 className="mb-3 text-xl font-semibold text-gray-900">
                    {formatDate(item.activity_date)} — {item.type_name || 'Unknown Type'} |{' '}
                    {item.subject || 'No Subject'}
                  </h2>

                  <div className="mb-3 space-y-1 text-sm text-black">
                    <p>
                      <span className="font-medium">External Attendees:</span>{' '}
                      {item.external_attendees || '—'}
                    </p>
                    <p>
                      <span className="font-medium">Internal Attendees:</span>{' '}
                      {item.internal_attendees || '—'}
                    </p>
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-6 text-black">
                    {noteContent}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
