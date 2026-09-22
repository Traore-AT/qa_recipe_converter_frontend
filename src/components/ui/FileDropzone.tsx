import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { cn } from '../../lib/cn';

interface FileDropzoneProps {
  /** Extensions acceptées, en minuscules avec le point (ex. `['.docx']`). */
  accept: string[];
  /** Taille maximale autorisée en octets. */
  maxSizeBytes: number;
  /** Appelé uniquement si le fichier respecte les contraintes. */
  onFileSelected: (file: File) => void;
  /** Remonte le message de refus (type ou taille) pour l'afficher à l'utilisateur. */
  onError: (message: string) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  /** Identifiant de l'input natif (utile pour les tests et les `label htmlFor`). */
  inputId?: string;
  /** Libellé accessible de l'input natif. */
  inputAriaLabel?: string;
}

const BYTES_PER_MB = 1024 * 1024;

function formatLimit(maxSizeBytes: number): string {
  return `${Math.round(maxSizeBytes / BYTES_PER_MB)} Mo`;
}

/**
 * Zone de dépôt de fichier accessible :
 * - clic, glisser-déposer et activation clavier (Entrée / Espace) ;
 * - validation du type et de la taille avant remontée du fichier ;
 * - message d'aide et d'erreur reliés par `aria-describedby`.
 */
export function FileDropzone({
  accept,
  maxSizeBytes,
  onFileSelected,
  onError,
  label,
  hint,
  disabled = false,
  className,
  inputId,
  inputAriaLabel,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const hintId = `${useId()}-hint`;
  const acceptAttribute = accept.join(',');

  const validate = (file: File | undefined): File | null => {
    if (!file) return null;
    const lowerName = file.name.toLowerCase();
    if (!accept.some((extension) => lowerName.endsWith(extension))) {
      onError(`Format non pris en charge. Formats acceptés : ${accept.join(', ')}.`);
      return null;
    }
    if (file.size > maxSizeBytes) {
      onError(`Fichier trop volumineux : la taille maximale est de ${formatLimit(maxSizeBytes)}.`);
      return null;
    }
    return file;
  };

  const handleFiles = (files: FileList | null) => {
    const file = validate(files?.[0]);
    if (file) onFileSelected(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={hint ? hintId : undefined}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={cn(
        'flex min-h-[9rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-lowest px-6 py-8 text-center transition-colors duration-200',
        'hover:border-primary/60 hover:bg-primary-fixed/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        dragActive && 'border-primary bg-primary-fixed/40',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
        upload_file
      </span>
      <p className="text-label-lg font-semibold text-on-surface">{label}</p>
      {hint && (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="sr-only"
        accept={acceptAttribute}
        disabled={disabled}
        aria-label={inputAriaLabel}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
