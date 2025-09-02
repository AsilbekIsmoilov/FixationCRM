# Инструкции по добавлению изображений

## Как добавить изображения в приложение:

### 1. Логотип компании
Скопируйте файл `assets/photo_2024-12-06_18-09-02-removebg-preview.png` в папку `public/assets/company-logo.png`

### 2. Фото администратора  
Скопируйте файл `assets/Аватар/Riskiyev Bonur Boxodir o'g'li.jpg` в папку `public/assets/admin-photo.jpg`

### 3. Фавикон (иконка в браузере)
Скопируйте файл `assets/синее лого.png` в папку `public/assets/favicon.png`

## Команды для копирования (выполнить в PowerShell):

```powershell
# Логотип компании (уже скопирован)
Copy-Item "assets\photo_2024-12-06_18-09-02-removebg-preview.png" "public\assets\company-logo.png" -Force

# Фавикон (уже скопирован)  
Copy-Item "assets\синее лого.png" "public\assets\favicon.png" -Force

# Фото администратора (нужно скопировать вручную из-за кириллических символов)
# Скопируйте вручную файл из assets\Аватар\Riskiyev Bonur Boxodir o'g'li.jpg 
# в public\assets\admin-photo.jpg
```

## Результат:
- В header слева будет отображаться логотип UZTELECOM + текст "CONTACT CENTER"
- В правом верхнем углу будет фото администратора (для роли admin)
- В браузере будет отображаться синий логотип в качестве фавикона
