import { useState } from 'react';
import { Upload, FileText, Image, Trash2, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storageService } from '@/services/storageService';
import { toast } from 'sonner';

interface DocumentFile {
  name: string;
  url: string;
  path: string;
  type: string;
  uploaded_at: string;
}

interface ProjectDocumentUploadProps {
  projectId: string;
  stageName: string;
  documents: DocumentFile[];
  onDocumentsChange: (documents: DocumentFile[]) => void;
  canDelete?: boolean;
}

export function ProjectDocumentUpload({
  projectId,
  stageName,
  documents,
  onDocumentsChange,
  canDelete = false,
}: ProjectDocumentUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newDocuments: DocumentFile[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        
        if (!['jpg', 'jpeg', 'png', 'pdf'].includes(fileExt || '')) {
          toast.error(`Formato não suportado: ${file.name}. Use JPG, PNG ou PDF.`);
          continue;
        }

        const folder = `projects/${projectId}/${stageName}`;
        const result = await storageService.upload(file, folder);

        newDocuments.push({
          name: file.name,
          url: result.url,
          path: result.path,
          type: fileExt || 'unknown',
          uploaded_at: new Date().toISOString(),
        });
      }

      if (newDocuments.length > 0) {
        onDocumentsChange([...documents, ...newDocuments]);
        toast.success(`${newDocuments.length} arquivo(s) enviado(s) com sucesso!`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivos');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (doc: DocumentFile) => {
    try {
      await storageService.delete(doc.path);
      onDocumentsChange(documents.filter((d) => d.path !== doc.path));
      toast.success('Arquivo removido com sucesso!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

  const handleDownload = async (doc: DocumentFile) => {
    try {
      const downloadUrl = await storageService.getDownloadUrl(doc.path);
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const getFileIcon = (type: string) => {
    if (['jpg', 'jpeg', 'png'].includes(type)) {
      return <Image className="h-5 w-5 text-chart-3" />;
    }
    return <FileText className="h-5 w-5 text-chart-1" />;
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-impulse-gold/50 transition-colors">
        <input
          type="file"
          id={`file-upload-${stageName}`}
          className="hidden"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <label
          htmlFor={`file-upload-${stageName}`}
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-impulse-gold animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground">
            {uploading ? 'Enviando...' : 'Clique para enviar fotos ou documentos'}
          </span>
          <span className="text-xs text-muted-foreground">JPG, PNG ou PDF</span>
        </label>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">
            Arquivos anexados ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.type)}
                  <div>
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                      {doc.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc)}
                    className="h-8 w-8"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
