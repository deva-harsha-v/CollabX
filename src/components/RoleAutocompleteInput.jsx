import React, { useState, useRef, useEffect } from 'react';
import { Tag, X, Plus, Check } from 'lucide-react';
import { AVAILABLE_ROLES, searchRoles } from '../data/rolesData';

const RoleAutocompleteInput = ({ 
  selectedRoles = [], 
  onChange, 
  placeholder = "Type a role (e.g. 'hy' for Hydrologist)...",
  label = "Required Roles / Skills",
  maxRoles = 10,
  allowCustom = true,
  className = ""
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (query.trim()) {
      const results = searchRoles(query, 10).filter(r => !selectedRoles.includes(r));
      setSuggestions(results);
      setIsOpen(true);
      setHighlightedIndex(0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query, selectedRoles]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRole = (role) => {
    if (!role) return;
    if (selectedRoles.includes(role)) {
      setQuery('');
      setIsOpen(false);
      return;
    }
    if (selectedRoles.length >= maxRoles) return;

    onChange([...selectedRoles, role]);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleRemoveRole = (roleToRemove) => {
    onChange(selectedRoles.filter(r => r !== roleToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev + 1) % suggestions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestions.length > 0 && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectRole(suggestions[highlightedIndex]);
      } else if (query.trim() && allowCustom) {
        handleSelectRole(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Backspace' && !query && selectedRoles.length > 0) {
      handleRemoveRole(selectedRoles[selectedRoles.length - 1]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-[#F6DBC0] uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#F6DBC0]" />
            <span>{label}</span>
          </span>
          <span className="text-[10px] text-[#F6DBC0]/70 font-mono font-normal">
            {selectedRoles.length}/{maxRoles} selected
          </span>
        </label>
      )}

      {/* Selected Pills */}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#502D55]/80 border border-[#935073]/40 min-h-[38px] items-center">
          {selectedRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#935073] border border-[#935073]/60 text-xs font-mono text-[#F8F4E9] shadow-sm animate-fade-in"
            >
              <span>{role}</span>
              <button
                type="button"
                onClick={() => handleRemoveRole(role)}
                className="text-[#F6DBC0]/70 hover:text-red-400 p-0.5 rounded transition-colors"
                title="Remove role"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Field with Dropdown Container */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={selectedRoles.length >= maxRoles ? `Max ${maxRoles} roles selected` : placeholder}
          disabled={selectedRoles.length >= maxRoles}
          className="w-full px-3.5 py-2.5 bg-[#502D55]/90 border border-[#935073]/40 rounded-xl text-xs text-[#F8F4E9] placeholder:text-[#F6DBC0]/40 focus:outline-none focus:border-[#F6DBC0] transition-colors font-mono disabled:opacity-50"
        />

        {/* Autocomplete Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto bg-[#502D55]/95 border-2 border-red-500/40 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-1.5">
            <div className="px-2 py-1 text-[10px] font-mono text-[#F6DBC0]/70 uppercase tracking-wider border-b border-[#935073]/30 mb-1 flex items-center justify-between">
              <span>Matching Roles ({suggestions.length})</span>
              <span className="text-[9px]">Press Enter or Click</span>
            </div>
            {suggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectRole(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                    isHighlighted 
                      ? 'bg-gradient-to-r from-red-600/80 to-red-800/80 text-white font-bold' 
                      : 'text-[#F8F4E9] hover:bg-[#935073]/50'
                  }`}
                >
                  <span>{item}</span>
                  <Plus className={`w-3.5 h-3.5 ${isHighlighted ? 'text-white' : 'text-[#F6DBC0]/70'}`} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleAutocompleteInput;
