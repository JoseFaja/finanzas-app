"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Upload, X } from "lucide-react";

interface CatalogItem {
  id: number;
  nombre: string;
}

interface UserProfile {
  id: number;
  nombre: string | null;
  apellido: string | null;
  correo: string;
  numeroDocumento: string | null;
  idTipoDocumento: number | null;
  googleImage: string | null;
  tipoDocumento: CatalogItem | null;
  estado: CatalogItem | null;
}

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  documentTypes: CatalogItem[];
  onSave: (profile: UserProfile) => Promise<void> | void;
}

export function ProfileEditor({
  isOpen,
  onClose,
  profile,
  documentTypes,
  onSave,
}: ProfileEditorProps) {
  const [editedProfile, setEditedProfile] = useState(profile);
  const [previewImage, setPreviewImage] = useState(profile.googleImage ?? "");

  useEffect(() => {
    setEditedProfile(profile);
    setPreviewImage(profile.googleImage ?? "");
  }, [profile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const image = reader.result as string;
      setPreviewImage(image);
      setEditedProfile((current) => ({ ...current, googleImage: image }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    await onSave(editedProfile);
    onClose();
  };

  const initials =
    `${editedProfile.nombre?.[0] ?? ""}${editedProfile.apellido?.[0] ?? ""}` || "U";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewImage} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
                  <Upload className="h-4 w-4" />
                  Cambiar imagen
                </div>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </Label>
              {previewImage !== (profile.googleImage ?? "") ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewImage(profile.googleImage ?? "");
                    setEditedProfile((current) => ({
                      ...current,
                      googleImage: profile.googleImage,
                    }));
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={editedProfile.nombre ?? ""}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, nombre: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={editedProfile.apellido ?? ""}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, apellido: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" value={editedProfile.correo} disabled />
            </div>

            <div>
              <Label htmlFor="documentType">Tipo de documento</Label>
              <Select
                value={editedProfile.idTipoDocumento ? String(editedProfile.idTipoDocumento) : ""}
                onValueChange={(value) =>
                  setEditedProfile({
                    ...editedProfile,
                    idTipoDocumento: value ? Number(value) : null,
                  })
                }
              >
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="documentNumber">Número de documento</Label>
              <Input
                id="documentNumber"
                value={editedProfile.numeroDocumento ?? ""}
                onChange={(e) =>
                  setEditedProfile({
                    ...editedProfile,
                    numeroDocumento: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Guardar cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
