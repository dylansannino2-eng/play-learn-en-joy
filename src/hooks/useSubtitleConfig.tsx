import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Subtitle } from "@/lib/srtParser";
import { RepeatConfig } from "@/components/ConfigPanel";
import { toast } from "sonner";

export interface SubtitleConfig {
  id: string;
  name: string;
  video_id: string;
  start_time: number;
  end_time: number;
  subtitles: Subtitle[];
  translations: Subtitle[];
  repeat_enabled: boolean;
  repeat_start_time: number;
  repeat_end_time: number;
  repeat_count: number;
  created_at: string;
  updated_at: string;
}

export function useSubtitleConfig() {
  const [configs, setConfigs] = useState<SubtitleConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<SubtitleConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar todas las configuraciones
  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("subtitle_configs")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error loading configs:", error);
      toast.error("Error al cargar configuraciones");
    } else {
      const mappedData = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        video_id: item.video_id,
        start_time: Number(item.start_time),
        end_time: Number(item.end_time),
        subtitles: (item.subtitles as unknown as Subtitle[]) || [],
        translations: (item.translations as unknown as Subtitle[]) || [],
        repeat_enabled: item.repeat_enabled,
        repeat_start_time: Number(item.repeat_start_time),
        repeat_end_time: Number(item.repeat_end_time),
        repeat_count: item.repeat_count || 3,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
      setConfigs(mappedData);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Guardar configuración
  const saveConfig = async (configData: any) => {
    // Log para ver qué llega al hook exactamente
    console.log("Hook recibiendo datos:", configData);

    const { data, error } = await supabase
      .from("subtitle_configs")
      .insert([
        {
          name: configData.name,
          video_id: configData.video_id, // <--- ASEGÚRATE QUE ESTO COINCIDA CON TU COLUMNA
          start_time: configData.start_time || 0,
          end_time: configData.end_time || 0,
          subtitles: configData.subtitles || [],
          translations: configData.translations || [],
          repeat_enabled: configData.repeat_enabled || false,
          repeat_start_time: configData.repeat_start_time || 0,
          repeat_end_time: configData.repeat_end_time || 0,
          repeat_count: configData.repeat_count || 0,
          is_active: true,
        },
      ])
      .select();

    if (error) {
      console.error("Error de Supabase:", error);
      throw error;
    }
    return data;
  };

  // Cargar una configuración específica
  const loadConfig = useCallback(async (id: string) => {
    const { data, error } = await supabase.from("subtitle_configs").select("*").eq("id", id).maybeSingle();

    if (error || !data) {
      console.error("Error loading config:", error);
      toast.error("Error al cargar configuración");
      return null;
    }

    const mapped: SubtitleConfig = {
      id: data.id,
      name: data.name,
      video_id: data.video_id,
      start_time: Number(data.start_time),
      end_time: Number(data.end_time),
      subtitles: (data.subtitles as unknown as Subtitle[]) || [],
      translations: (data.translations as unknown as Subtitle[]) || [],
      repeat_enabled: data.repeat_enabled,
      repeat_start_time: Number(data.repeat_start_time),
      repeat_end_time: Number(data.repeat_end_time),
      repeat_count: data.repeat_count || 3,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    setCurrentConfig(mapped);
    return mapped;
  }, []);

  // Eliminar configuración
  const deleteConfig = async (id: string) => {
    const { error } = await supabase.from("subtitle_configs").delete().eq("id", id);

    if (error) {
      console.error("Error deleting config:", error);
      toast.error("Error al eliminar configuración");
      return false;
    }

    toast.success("Configuración eliminada");
    await loadConfigs();
    return true;
  };

  return {
    configs,
    currentConfig,
    isLoading,
    loadConfigs,
    saveConfig,
    loadConfig,
    deleteConfig,
    setCurrentConfig,
  };
}
