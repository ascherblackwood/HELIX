import React, { useState } from 'react';
import { BookOpenIcon, MagnifyingGlassIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const KnowledgeBasePage = () => {
  const [query, setQuery] = useState('');

  const articles = [
    { id: 'kb-001', title: 'Joining a PC to the Domain', summary: 'Step-by-step guide to join Windows to AD.', tags: ['Active Directory', 'Windows'] },
    { id: 'kb-002', title: 'Enable WinRM Remotely', summary: 'How to enable and test WinRM for remote tasks.', tags: ['WinRM', 'Remote'] },
    { id: 'kb-003', title: 'Resetting AD User Passwords', summary: 'Securely resetting and expiring passwords.', tags: ['Users', 'Security'] },
  ];

  const filtered = !query.trim()
    ? articles
    : articles.filter(a => (
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.summary.toLowerCase().includes(query.toLowerCase()) ||
        a.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
      ));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BookOpenIcon className="w-8 h-8 text-blue-600 mr-2" />
          Knowledge Base
        </h1>
        <p className="mt-2 text-gray-600">Curated guidance and how‑tos. Placeholder content for now.</p>
      </div>

      <div className="mb-6">
        <div className="relative max-w-xl">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search articles, tags..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(a => (
          <div key={a.id} className="card p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{a.title}</h3>
              <InformationCircleIcon className="w-5 h-5 text-gray-400" />
            </div>
            <p className="mt-2 text-gray-600 text-sm">{a.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {a.tags.map(t => (
                <span key={t} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">{t}</span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-gray-500">No results. Try a different search.</div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBasePage;

