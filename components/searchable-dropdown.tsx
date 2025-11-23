"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { X, ChevronDown, ChevronsDown } from "lucide-react"

interface SearchableDropdownProps {
  items: Array<{
    id: string | number
    name: string
    [key: string]: any
  }>
  selectedItem: any
  onSelect: (item: any) => void
  placeholder?: string
  searchPlaceholder?: string
  label?: string
  disabled?: boolean
  error?: string
  required?: boolean
  clearable?: boolean
  renderItem?: (item: any) => React.ReactNode
  filterFn?: (item: any, searchTerm: string) => boolean
}

export function SearchableDropdown({
  items,
  selectedItem,
  onSelect,
  placeholder = "Select an item...",
  searchPlaceholder = "Search...",
  label,
  disabled = false,
  error,
  required = false,
  clearable = true,
  renderItem,
  filterFn,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Default filter function
  const defaultFilterFn = (item: any, term: string) => {
    return item.name.toLowerCase().includes(term.toLowerCase())
  }

  const filter = filterFn || defaultFilterFn
  const filteredItems = items.filter((item) => filter(item, searchTerm))

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      // Clear search term when opening to show all items
      setSearchTerm("")
    }
  }, [isOpen])

  const handleSelect = (item: any) => {
    onSelect(item)
    setIsOpen(false)
    setSearchTerm("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(null)
    setSearchTerm("")
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )} */}

      <div className="relative">
        <div className="flex items-center gap-0">
          {/* Trigger Button */}
          <button
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            type="button"
            className={`flex-1 px-4 py-2 bg-input border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm cursor-pointer transition-colors flex items-center justify-between ${
              error ? "border-destructive" : "border-border"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary"}`}
          >
            <span className={selectedItem ? "text-foreground" : "text-muted-foreground"}>
              {selectedItem ? (renderItem ? renderItem(selectedItem) : selectedItem.name) : placeholder}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Clear Button - Separate from trigger button */}
          {selectedItem && clearable && !disabled && (
            <button
              onClick={handleClear}
              className={`px-3 py-2 bg-input border border-l-0 rounded-r-lg hover:bg-muted transition-colors ${
                error ? "border-destructive" : "border-border"
              }`}
              type="button"
              title="Clear selection"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}

          {/* Placeholder for clear button space when no item selected */}
         {(!selectedItem || !clearable || disabled) && (
  <button
    className={`px-3 py-2 bg-input border border-l-0 rounded-r-lg hover:bg-muted transition-colors ${
      error ? "border-destructive" : "border-border"
    }`}
    type="button"
    title="Open dropdown"
  >
    <ChevronsDown className="w-4 h-4 text-muted-foreground hover:text-foreground" />
  </button>
)}

        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50">
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  console.log("[v0] Search term changed:", e.target.value)
                  setSearchTerm(e.target.value)
                }}
                className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground text-sm"
              />
            </div>

            {/* Items List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="px-4 py-3 text-center text-muted-foreground text-sm">
                  {searchTerm ? "No items found" : "No items available"}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      console.log("[v0] Item selected:", item.name)
                      handleSelect(item)
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors text-sm ${
                      selectedItem?.id === item.id ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                    }`}
                    type="button"
                  >
                    {renderItem ? renderItem(item) : item.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
