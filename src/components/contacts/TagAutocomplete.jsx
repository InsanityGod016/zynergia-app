import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { db } from '@/api/db';

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-419')
    .trim();
}

export default function TagAutocomplete({ selectedTagIds = [], onChange }) {
  const queryClient = useQueryClient();
  const rootRef = useRef(null);
  const textInputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const tagsQuery = useQuery({
    queryKey: ['tags'],
    queryFn: () => db.Tag.list(),
  });
  const tags = tagsQuery.data ?? [];

  const createTagMutation = useMutation({
    mutationFn: /** @param {string} name */ (name) => db.Tag.create({ name, category: 'condition' }),
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      onChange([...selectedTagIds, newTag.id]);
      setInputValue('');
      setIsOpen(false);
      textInputRef.current?.focus();
    },
  });

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const matchingTags = useMemo(() => {
    const term = normalize(inputValue);
    return tags.filter((tag) => (
      !selectedTagIds.includes(tag.id) && (!term || normalize(tag.name).includes(term))
    ));
  }, [inputValue, selectedTagIds, tags]);
  const exactMatch = tags.some((tag) => normalize(tag.name) === normalize(inputValue));

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const addTag = (tagId) => {
    onChange([...selectedTagIds, tagId]);
    setInputValue('');
    setIsOpen(false);
    textInputRef.current?.focus();
  };

  const createTag = () => {
    const name = inputValue.trim();
    if (name) createTagMutation.mutate(name);
  };

  return (
    <div className="relative" ref={rootRef}>
      {selectedTags.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Etiquetas seleccionadas">
          {selectedTags.map((tag) => (
            <li key={tag.id} className="inline-flex min-h-12 items-center gap-1 rounded-2xl bg-primary/10 pl-3 text-[15px] font-medium text-primary">
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => onChange(selectedTagIds.filter((id) => id !== tag.id))}
                className="flex h-12 w-12 items-center justify-center rounded-2xl outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Quitar etiqueta ${tag.name}`}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={textInputRef}
        type="text"
        autoComplete="off"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
          if (event.key === 'Enter' && inputValue.trim() && !exactMatch) {
            event.preventDefault();
            createTag();
          }
        }}
        placeholder="Escribe para buscar o crear"
        className="h-14 w-full rounded-2xl border border-border bg-card px-4 text-[17px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        role="combobox"
        aria-label="Agregar etiquetas"
        aria-expanded={isOpen}
        aria-controls="tag-options"
        aria-autocomplete="list"
      />

      {tagsQuery.isError && (
        <div className="mt-2 flex items-center justify-between gap-3 text-[15px]" role="alert">
          <span className="text-destructive">No pudimos cargar las etiquetas.</span>
          <button type="button" onClick={() => tagsQuery.refetch()} className="min-h-12 rounded-xl px-3 font-semibold text-primary">
            Reintentar
          </button>
        </div>
      )}
      {createTagMutation.isError && (
        <p className="mt-2 text-[15px] text-destructive" role="alert">
          No pudimos crear la etiqueta. Lo que escribiste sigue aquí.
        </p>
      )}

      {isOpen && !tagsQuery.isError && (
        <div
          id="tag-options"
          role="listbox"
          className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-border bg-card p-1 shadow-xl"
        >
          {tagsQuery.isPending && <p className="px-4 py-4 text-[15px] text-muted-foreground">Cargando etiquetas…</p>}
          {!tagsQuery.isPending && matchingTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => addTag(tag.id)}
              className="min-h-12 w-full rounded-xl px-4 text-left text-[17px] text-foreground outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
            >
              {tag.name}
            </button>
          ))}
          {!tagsQuery.isPending && inputValue.trim() && !exactMatch && (
            <button
              type="button"
              onClick={createTag}
              disabled={createTagMutation.isPending}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl px-4 text-left text-[17px] font-semibold text-primary outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
              {createTagMutation.isPending ? 'Creando…' : `Crear “${inputValue.trim()}”`}
            </button>
          )}
          {!tagsQuery.isPending && !inputValue.trim() && matchingTags.length === 0 && (
            <p className="px-4 py-4 text-[15px] text-muted-foreground">Todavía no hay etiquetas.</p>
          )}
        </div>
      )}
    </div>
  );
}
