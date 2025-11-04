import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  ciudad_origen_id: z.number().min(1, "Origin city is required"),
  ciudad_destino_id: z.number().min(1, "Destination city is required"),
  dias_transito: z.number().min(0, "Transit days must be 0 or greater"),
  carrier_id: z.number().nullable().optional(),
  producto_id: z.number().nullable().optional(),
  target_percentage: z.number().min(0).max(100).default(90),
}).refine(data => data.ciudad_origen_id !== data.ciudad_destino_id, {
  message: "Origin and destination cities must be different",
  path: ["ciudad_destino_id"],
});

type FormValues = z.infer<typeof formSchema>;

interface Ciudad {
  id: number;
  codigo: string;
  nombre: string;
  clasificacion: string;
}

interface Carrier {
  id: number;
  carrier_code: string;
  legal_name: string;
}

interface Producto {
  id: number;
  codigo_producto: string;
  nombre_producto: string;
}

interface TransitTimeFormProps {
  transitTimeId?: number;
  clienteId: number | null;
  onSuccess: () => void;
}

export default function TransitTimeForm({ transitTimeId, clienteId, onSuccess }: TransitTimeFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [loadingCiudades, setLoadingCiudades] = useState(true);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ciudad_origen_id: 0,
      ciudad_destino_id: 0,
      dias_transito: 0,
      carrier_id: null,
      producto_id: null,
      target_percentage: 90,
    },
  });

  useEffect(() => {
    if (clienteId) {
      loadCiudades();
      loadCarriers();
      loadProductos();
    }
  }, [clienteId]);

  useEffect(() => {
    if (transitTimeId) {
      loadTransitTime();
    }
  }, [transitTimeId]);

  const loadCiudades = async () => {
    if (!clienteId) return;
    
    setLoadingCiudades(true);
    try {
      const { data, error } = await supabase
        .from("ciudades")
        .select("id, codigo, nombre, clasificacion")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo")
        .order("nombre");

      if (error) throw error;
      setCiudades(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingCiudades(false);
    }
  };

  const loadCarriers = async () => {
    if (!clienteId) return;
    
    try {
      const { data, error } = await supabase
        .from("carriers")
        .select("id, carrier_code, legal_name")
        .eq("cliente_id", clienteId)
        .eq("status", "active")
        .order("carrier_code");

      if (error) throw error;
      setCarriers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadProductos = async () => {
    if (!clienteId) return;
    
    try {
      const { data, error } = await supabase
        .from("productos_cliente")
        .select("id, codigo_producto, nombre_producto")
        .eq("cliente_id", clienteId)
        .eq("estado", "activo")
        .order("codigo_producto");

      if (error) throw error;
      setProductos(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadTransitTime = async () => {
    if (!transitTimeId) return;
    
    try {
      const { data, error } = await supabase
        .from("ciudad_transit_times")
        .select("*")
        .eq("id", transitTimeId)
        .single();

      if (error) throw error;
      if (data) {
        form.reset({
          ciudad_origen_id: data.ciudad_origen_id,
          ciudad_destino_id: data.ciudad_destino_id,
          dias_transito: data.dias_transito,
          carrier_id: (data as any).carrier_id,
          producto_id: (data as any).producto_id,
          target_percentage: (data as any).target_percentage || 90,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      const payload = {
        ciudad_origen_id: values.ciudad_origen_id,
        ciudad_destino_id: values.ciudad_destino_id,
        dias_transito: values.dias_transito,
        carrier_id: values.carrier_id || null,
        producto_id: values.producto_id || null,
        target_percentage: values.target_percentage,
        cliente_id: clienteId,
      };

      if (transitTimeId) {
        const { error } = await supabase
          .from("ciudad_transit_times")
          .update(payload)
          .eq("id", transitTimeId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ciudad_transit_times")
          .insert([payload]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: transitTimeId ? "Transit time updated successfully" : "Transit time created successfully",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingCiudades) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="ciudad_origen_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Origin City</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin city" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ciudades.map((ciudad) => (
                    <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                      {ciudad.codigo} - {ciudad.nombre} (Class {ciudad.clasificacion})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ciudad_destino_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination City</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value ? field.value.toString() : ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination city" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ciudades.map((ciudad) => (
                    <SelectItem key={ciudad.id} value={ciudad.id.toString()}>
                      {ciudad.codigo} - {ciudad.nombre} (Class {ciudad.clasificacion})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="carrier_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Carrier (Optional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "all" ? null : parseInt(value))}
                value={field.value ? field.value.toString() : "all"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="All carriers" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All carriers</SelectItem>
                  {carriers.map((carrier) => (
                    <SelectItem key={carrier.id} value={carrier.id.toString()}>
                      {carrier.carrier_code} - {carrier.legal_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="producto_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product (Optional)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "all" ? null : parseInt(value))}
                value={field.value ? field.value.toString() : "all"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All products</SelectItem>
                  {productos.map((producto) => (
                    <SelectItem key={producto.id} value={producto.id.toString()}>
                      {producto.codigo_producto} - {producto.nombre_producto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dias_transito"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transit Days</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="target_percentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target % of Events</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="90"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 90)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              transitTimeId ? "Update" : "Create"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
