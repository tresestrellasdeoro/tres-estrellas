-- Agrega columna JSONB para mapeo de categoría de gasto → cuenta QB por sucursal
ALTER TABLE sucursales
  ADD COLUMN IF NOT EXISTS qb_expense_accounts JSONB DEFAULT '{}';

-- Huntington Park
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "507",
  "Suministros":       "331",
  "Mantenimiento":     "90",
  "Comida / Viáticos": "332",
  "Servicios":         "333",
  "Publicidad":        "322",
  "Otros":             "339"
}' WHERE code = 'HP';

-- Los Angeles
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "542",
  "Suministros":       "361",
  "Mantenimiento":     "308",
  "Comida / Viáticos": "362",
  "Servicios":         "363",
  "Publicidad":        "352",
  "Otros":             "369"
}' WHERE code = 'LAX';

-- Anaheim ARTIC
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "509",
  "Suministros":       "451",
  "Mantenimiento":     "448",
  "Comida / Viáticos": "452",
  "Servicios":         "453",
  "Publicidad":        "442",
  "Otros":             "459"
}' WHERE code = 'ARTIC';

-- Otay
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "319",
  "Suministros":       "481",
  "Mantenimiento":     "478",
  "Comida / Viáticos": "482",
  "Servicios":         "483",
  "Publicidad":        "472",
  "Otros":             "489"
}' WHERE code = 'OTY';

-- El Paso
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "540",
  "Suministros":       "56",
  "Mantenimiento":     "531",
  "Comida / Viáticos": "319",
  "Servicios":         "532",
  "Publicidad":        "530",
  "Otros":             "495"
}' WHERE code = 'ELP';

-- Fresno
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "508",
  "Suministros":       "56",
  "Mantenimiento":     "1150040002",
  "Comida / Viáticos": "536",
  "Servicios":         "536",
  "Publicidad":        "20",
  "Otros":             "536"
}' WHERE code = 'FAT';

-- Santa Ana
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "512",
  "Suministros":       "421",
  "Mantenimiento":     "418",
  "Comida / Viáticos": "422",
  "Servicios":         "423",
  "Publicidad":        "412",
  "Otros":             "429"
}' WHERE code = 'SNA';

-- San Ysidro
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "510",
  "Suministros":       "391",
  "Mantenimiento":     "388",
  "Comida / Viáticos": "392",
  "Servicios":         "393",
  "Publicidad":        "382",
  "Otros":             "399"
}' WHERE code = 'SYC';

-- Phoenix (cuentas limitadas en QB — usa PHOE EXPENSES como fallback)
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "503",
  "Suministros":       "56",
  "Mantenimiento":     "1150040002",
  "Comida / Viáticos": "503",
  "Servicios":         "503",
  "Publicidad":        "20",
  "Otros":             "503"
}' WHERE code = 'PHOE';

-- SAC (cuentas limitadas en QB — usa SAC EXPENSES como fallback)
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "497",
  "Suministros":       "56",
  "Mantenimiento":     "1150040002",
  "Comida / Viáticos": "497",
  "Servicios":         "497",
  "Publicidad":        "20",
  "Otros":             "497"
}' WHERE code = 'SAC';

-- AHM, CBX, LTI (sin cuentas específicas en QB — usa cuentas generales)
UPDATE sucursales SET qb_expense_accounts = '{
  "Gasolina":          "317",
  "Renta":             "319",
  "Suministros":       "56",
  "Mantenimiento":     "1150040002",
  "Comida / Viáticos": "319",
  "Servicios":         "319",
  "Publicidad":        "20",
  "Otros":             "319"
}' WHERE code IN ('AHM', 'CBX', 'LTI');

NOTIFY pgrst, 'reload schema';
