

"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, X, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

const multiSelectVariants = cva(
  "m-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300",
  {
    variants: {
      variant: {
        default:
          "border-foreground/10 text-foreground bg-card hover:bg-card/80",
        secondary:
          "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        inverted: "inverted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface MultiSelectProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
    badge?: 'Rem' | 'Queue' | 'My' | 'SpaRE';
  }[]
  onValueChange: (value: string[]) => void
  defaultValue: string[]
  placeholder?: string
  animation?: number
  maxCount?: number
  asChild?: boolean
  className?: string
  disabled?: boolean;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      onValueChange,
      variant,
      defaultValue = [],
      placeholder = "Select options",
      animation = 0,
      maxCount = 3,
      asChild = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] =
      React.useState<string[]>(defaultValue)
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false)

    React.useEffect(() => {
      setSelectedValues(defaultValue)
    }, [defaultValue])

    const handleInputKeyDown = (
      event: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (event.key === "Enter") {
        setIsPopoverOpen(true)
      } else if (event.key === "Backspace" && !event.currentTarget.value) {
        const newSelectedValues = [...selectedValues]
        newSelectedValues.pop()
        setSelectedValues(newSelectedValues)
        onValueChange(newSelectedValues)
      }
    }

    const toggleOption = (value: string) => {
      const newSelectedValues = selectedValues.includes(value)
        ? selectedValues.filter((v) => v !== value)
        : [...selectedValues, value]
      setSelectedValues(newSelectedValues)
      onValueChange(newSelectedValues)
    }

    return (
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            {...props}
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className={cn("flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-card", className)}
            disabled={disabled}
          >
            {selectedValues.length > 0 ? (
              <div className="flex justify-between items-center w-full">
                <div className="flex flex-wrap items-center">
                  {selectedValues.slice(0, maxCount).map((value) => {
                    const option = options.find((o) => o.value === value)
                    if (!option) return null;
                    const Icon = option.icon
                    return (
                      <Badge
                        key={value}
                        className={cn(multiSelectVariants({ variant }))}
                        style={{ animationDelay: `${animation}s` }}
                      >
                        {Icon && (
                          <Icon className="h-4 w-4 mr-2" />
                        )}
                        {option.label}
                        <X
                          className="ml-2 h-4 w-4 cursor-pointer"
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleOption(value)
                          }}
                        />
                      </Badge>
                    )
                  })}
                  {selectedValues.length > maxCount && (
                    <Badge
                      className={cn(
                        "bg-transparent text-foreground border-foreground/10",
                        multiSelectVariants({ variant })
                      )}
                      style={{ animationDelay: `${animation}s` }}
                    >
                      {`+ ${selectedValues.length - maxCount} more`}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <X
                    className="h-4 w-4 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedValues([])
                      onValueChange([])
                    }}
                  />
                  <ChevronsUpDown className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full mx-auto">
                <span className="text-sm text-muted-foreground mx-3">{placeholder}</span>
                <ChevronsUpDown className="h-4 w-4 mx-2" />
              </div>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Search..."
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selectedValues.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleOption(option.value)}
                      style={{
                        pointerEvents: "auto",
                        opacity: 1,
                      }}
                      className="cursor-pointer flex justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                            className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary shrink-0",
                            isSelected
                                ? "bg-primary text-primary-foreground"
                                : "opacity-50 [&_svg]:invisible"
                            )}
                        >
                            <Check className="h-4 w-4" />
                        </div>
                        {option.icon && (
                            <option.icon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{option.label}</span>
                      </div>
                      {option.badge === 'Rem' && (
                        <Badge 
                          style={{ 
                            backgroundColor: '#FBBF24', 
                            color: '#78350F'
                          }} 
                          className="text-xs border-none px-2 py-0.5"
                        >
                          Rem
                        </Badge>
                      )}
                      {option.badge === 'Queue' && (
                        <Badge style={{ backgroundColor: '#F59E0B' }} className="text-white text-xs">
                          Queue
                        </Badge>
                      )}
                       {option.badge === 'SpaRE' && (
                        <Badge style={{ backgroundColor: '#10B981' }} className="text-white text-xs">
                          SpaRE
                        </Badge>
                      )}
                      {option.badge === 'My' && (
                         <Badge style={{ backgroundColor: '#3B82F6' }} className="text-white text-xs">
                          My
                        </Badge>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)

MultiSelect.displayName = "MultiSelect"

export { MultiSelect }
