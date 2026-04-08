import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function NewSale1() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => db.Contact.list()
  });

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    return contacts.filter(c => 
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
  }, [contacts, searchTerm]);

  const handleSelectContact = (contactId) => {
    setSelectedContactId(contactId);
    setTimeout(() => {
      navigate(createPageUrl('NewSale2'), { 
        state: { contactId } 
      });
    }, 200);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center border-b border-[#F0F0F0]">
        <button
          onClick={() => navigate(createPageUrl('Sales'))}
          className="w-10 h-10 flex items-center justify-center -ml-2 relative z-10 active:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5 text-[#27251f]" />
        </button>
        <h1 className="text-xl font-semibold text-[#27251f] ml-2">Nueva venta</h1>
      </div>

      {/* Search */}
      <div className="px-6 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E6E73]" />
          <Input
            placeholder="Buscar contacto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-full border-[#EAEAEA]"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="px-6 pt-4 pb-6 space-y-3">
        {filteredContacts.map(contact => (
          <button
            key={contact.id}
            onClick={() => handleSelectContact(contact.id)}
            className={`w-full bg-white rounded-3xl p-4 border-2 text-left transition-all ${
              selectedContactId === contact.id
                ? 'border-[#004AFE]'
                : 'border-[#EAEAEA]'
            }`}
          >
            <h3 className="font-semibold text-[#27251f] text-[15px]">
              {contact.full_name}
            </h3>
            <p className="text-[13px] text-[#6E6E73] mt-0.5">
              {contact.phone}
            </p>
            {contact.notes && (
              <p className="text-[13px] text-[#6E6E73] mt-1">
                {contact.notes}
              </p>
            )}
          </button>
        ))}

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#6E6E73] text-sm">No se encontraron contactos</p>
          </div>
        )}
      </div>
    </div>
  );
}