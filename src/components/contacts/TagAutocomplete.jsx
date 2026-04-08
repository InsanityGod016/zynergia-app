import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { X, Plus } from 'lucide-react';

export default function TagAutocomplete({ selectedTagIds = [], onChange }) {
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: () => db.Tag.list()
  });

  const createTagMutation = useMutation({
    mutationFn: (data) => db.Tag.create(data),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onChange([...selectedTagIds, newTag.id]);
      setInputValue('');
      setIsOpen(false);
    }
  });

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));
  const availableTags = tags.filter(t => !selectedTagIds.includes(t.id));
  
  const matchingTags = availableTags.filter(t => 
    t.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatch = matchingTags.some(t => 
    t.name.toLowerCase() === inputValue.toLowerCase()
  );

  const handleAddTag = (tagId) => {
    onChange([...selectedTagIds, tagId]);
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagId) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateTag = () => {
    if (!inputValue.trim()) return;
    createTagMutation.mutate({
      name: inputValue.trim(),
      category: 'condition'
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map(tag => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EEF2FF] text-[#004AFE] text-[12px] font-medium"
            >
              <span>{tag.name}</span>
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="hover:bg-[#004AFE]/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Agregar etiquetas..."
        className="w-full h-11 px-4 rounded-full border border-[#E2E8F0] text-[15px] placeholder:text-[#94A3B8] focus:border-[#004AFE] focus:outline-none focus:ring-2 focus:ring-[#004AFE]/20 transition-all"
      />

      {/* Dropdown */}
      {isOpen && (inputValue || matchingTags.length > 0) && (
        <div className="absolute z-10 w-full mt-2 bg-white rounded-xl border border-[#E2E8F0] shadow-lg max-h-60 overflow-y-auto">
          {/* Matching tags */}
          {matchingTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => handleAddTag(tag.id)}
              className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] text-[15px] text-[#0F172A] border-b border-[#F1F5F9] last:border-b-0 transition-colors"
            >
              {tag.name}
            </button>
          ))}

          {/* Create new tag option */}
          {inputValue && !exactMatch && (
            <button
              onClick={handleCreateTag}
              disabled={createTagMutation.isPending}
              className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] text-[15px] flex items-center gap-2 text-[#004AFE] font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear "{inputValue}"
            </button>
          )}

          {matchingTags.length === 0 && !inputValue && (
            <div className="px-4 py-3 text-[13px] text-[#64748B]">
              Escribe para buscar o crear etiquetas
            </div>
          )}
        </div>
      )}
    </div>
  );
}