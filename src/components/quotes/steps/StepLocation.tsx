import { useState, useEffect } from 'react';
import { MapPin, Search, User, Sun, Navigation } from 'lucide-react';
import { QuoteFormData } from '../QuoteWizard';
import { Client, clientService } from '@/services/clientService';
import { RoofType } from '@/services/quoteService';
import { cn } from '@/lib/utils';

interface StepLocationProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  clients: Client[];
}

const ROOF_TYPES: { value: RoofType; label: string }[] = [
  { value: 'CERAMICA', label: 'Cerâmica' },
  { value: 'FIBROCIMENTO', label: 'Fibrocimento' },
  { value: 'METALICA', label: 'Metálica' },
  { value: 'LAJE', label: 'Laje' },
];

const ENERGY_DISTRIBUTORS = [
  'Cemig-D', 'CPFL Paulista', 'Enel SP', 'Enel RJ', 'Light', 'Copel',
  'Celesc', 'CEEE', 'Coelba', 'Celpe', 'Cosern', 'Equatorial',
  'Energisa', 'Elektro', 'EDP Espírito Santo', 'Neoenergia', 'Outra'
];

export function StepLocation({ formData, updateFormData, clients }: StepLocationProps) {
  const [isSearchingCEP, setIsSearchingCEP] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(formData.client_id || '');
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if ((formData.client_id || '') !== selectedClientId) {
      setSelectedClientId(formData.client_id || '');
    }
  }, [formData.client_id, selectedClientId]);

  // Update map when address changes
  useEffect(() => {
    if (formData.address_city && formData.address_state) {
      const address = encodeURIComponent(
        `${formData.address_street || ''}, ${formData.address_number || ''}, ${formData.address_neighborhood || ''}, ${formData.address_city}, ${formData.address_state}, ${formData.address_zip_code || ''}, Brasil`
      );
      // Using OpenStreetMap embed (free, no API key required)
      setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`-50,-25,-40,-15`)}&layer=mapnik&marker=${encodeURIComponent(`${formData.latitude || -19.5},${formData.longitude || -43.5}`)}`);
    }
  }, [formData.address_city, formData.address_state, formData.address_street, formData.address_number]);

  const handleClientSelect = async (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      updateFormData({
        client_id: client.id,
        client: client,
        address_street: client.street || '',
        address_number: client.number || '',
        address_complement: client.complement || '',
        address_neighborhood: client.neighborhood || '',
        address_city: client.city || '',
        address_state: client.state || '',
        address_zip_code: client.zip_code || '',
      });
    }
  };

  const handleSearchCEP = async () => {
    if (!formData.address_zip_code) return;
    setIsSearchingCEP(true);
    try {
      const data = await clientService.searchCEP(formData.address_zip_code);
      updateFormData({
        address_street: data.logradouro,
        address_neighborhood: data.bairro,
        address_city: data.localidade,
        address_state: data.uf,
      });
      
      // Geocode with full address for accuracy
      geocodeAddress(data.logradouro, formData.address_number || '', data.bairro, data.localidade, data.uf, formData.address_zip_code);
    } catch (error) {
      console.error('CEP not found:', error);
    } finally {
      setIsSearchingCEP(false);
    }
  };

  const geocodeAddress = async (street?: string, number?: string, neighborhood?: string, city?: string, state?: string, zipCode?: string) => {
    try {
      const fullAddress = [
        number ? `${street}, ${number}` : street,
        neighborhood,
        city,
        state,
        zipCode,
        'Brasil'
      ].filter(Boolean).join(', ');
      
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&addressdetails=1`
      );
      const geoData = await geoResponse.json();
      if (geoData && geoData[0]) {
        updateFormData({
          latitude: parseFloat(geoData[0].lat),
          longitude: parseFloat(geoData[0].lon),
        });
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
  };

  // Re-geocode when address fields change
  useEffect(() => {
    if (formData.address_city && formData.address_street) {
      const timer = setTimeout(() => {
        geocodeAddress(
          formData.address_street,
          formData.address_number,
          formData.address_neighborhood,
          formData.address_city,
          formData.address_state,
          formData.address_zip_code
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.address_street, formData.address_number, formData.address_neighborhood, formData.address_city]);

  const fullAddress = `${formData.address_city || ''}, ${formData.address_state || ''}, ${formData.address_zip_code || ''}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-secondary/10">
            <MapPin className="h-6 w-6 text-secondary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Localização</h3>
            <p className="text-muted-foreground">Selecione o cliente e informe o local de instalação</p>
          </div>
        </div>
        <span className="text-sm font-medium text-secondary">Etapa 1/8</span>
      </div>

      {/* Top Row - Location, Irradiation, Roof Type, Distributor */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1">
            Localização <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullAddress}
              readOnly
              placeholder="Cidade, UF, CEP"
              className="flex-1 px-4 py-3 bg-muted border border-border rounded-xl text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-1">
            <Sun className="h-4 w-4 text-secondary" /> Irradiação
          </label>
          <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-xl text-sm">
            <span className="text-muted-foreground">~5.2 kWh/m²/dia</span>
            <Navigation className="h-4 w-4 text-secondary" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Tipo de Telhado <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.roof_type || ''}
            onChange={(e) => updateFormData({ roof_type: e.target.value as RoofType })}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          >
            <option value="">Selecione...</option>
            {ROOF_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Distribuidora de Energia <span className="text-destructive">*</span>
          </label>
          <select
            value={formData.energy_distributor || ''}
            onChange={(e) => updateFormData({ energy_distributor: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          >
            <option value="">Selecione...</option>
            {ENERGY_DISTRIBUTORS.map((dist) => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Display */}
      <div className="rounded-2xl overflow-hidden border border-border bg-muted h-[400px] relative">
        {formData.address_city ? (
          <iframe
            title="Mapa do local"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${(formData.longitude || -43.5) - 0.05}%2C${(formData.latitude || -19.5) - 0.05}%2C${(formData.longitude || -43.5) + 0.05}%2C${(formData.latitude || -19.5) + 0.05}&layer=mapnik&marker=${formData.latitude || -19.5}%2C${formData.longitude || -43.5}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Preencha o endereço para visualizar o mapa</p>
            </div>
          </div>
        )}
        
        {/* Map overlay info box */}
        {formData.address_city && (
          <div className="absolute top-4 left-4 bg-card border border-border rounded-xl p-3 shadow-lg max-w-[250px]">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-secondary" />
              <div>
                <p className="font-semibold text-sm text-foreground">
                  {formData.address_city}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formData.address_city}, {formData.address_state}, {formData.address_zip_code}
                </p>
                <a 
                  href={`https://www.openstreetmap.org/?mlat=${formData.latitude}&mlon=${formData.longitude}#map=15/${formData.latitude}/${formData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-secondary hover:underline"
                >
                  Ver mapa ampliado
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Selection */}
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <User className="h-4 w-4" />
          Cliente
        </label>
        <select
          value={selectedClientId}
          onChange={(e) => handleClientSelect(e.target.value)}
          className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
        >
          <option value="">Selecione um cliente...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} - {client.document}
            </option>
          ))}
        </select>
      </div>

      {/* Address Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">CEP</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.address_zip_code || ''}
              onChange={(e) => updateFormData({ address_zip_code: e.target.value })}
              placeholder="00000-000"
              className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
            />
            <button
              onClick={handleSearchCEP}
              disabled={isSearchingCEP}
              className="px-3 py-3 bg-secondary text-secondary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium text-foreground">Rua</label>
          <input
            type="text"
            value={formData.address_street || ''}
            onChange={(e) => updateFormData({ address_street: e.target.value })}
            placeholder="Nome da rua"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Número</label>
          <input
            type="text"
            value={formData.address_number || ''}
            onChange={(e) => updateFormData({ address_number: e.target.value })}
            placeholder="Nº"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Complemento</label>
          <input
            type="text"
            value={formData.address_complement || ''}
            onChange={(e) => updateFormData({ address_complement: e.target.value })}
            placeholder="Apto, Bloco..."
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bairro</label>
          <input
            type="text"
            value={formData.address_neighborhood || ''}
            onChange={(e) => updateFormData({ address_neighborhood: e.target.value })}
            placeholder="Bairro"
            className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Cidade/UF</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.address_city || ''}
              onChange={(e) => updateFormData({ address_city: e.target.value })}
              placeholder="Cidade"
              className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
            />
            <input
              type="text"
              value={formData.address_state || ''}
              onChange={(e) => updateFormData({ address_state: e.target.value })}
              placeholder="UF"
              className="w-16 px-3 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary transition-all text-center"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
