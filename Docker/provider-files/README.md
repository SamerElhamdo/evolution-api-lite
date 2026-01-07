# Provider Files Server

سيرفر تخزين الجلسات الخارجي لـ Evolution API. يوفر تخزين آمن ومركزي لجلسات WhatsApp خارج السيرفر الرئيسي.

## 📋 المتطلبات

- Docker & Docker Compose
- Node.js 18+ (للتنفيذ المحلي فقط)
- Evolution API مع تفعيل Provider Files

## 🚀 البدء السريع

### 1. إعداد متغيرات البيئة

انسخ ملف `env.example` إلى `.env`:

```bash
cp env.example .env
```

عدّل القيم في `.env` لتطابق إعدادات Evolution API:

```env
PROVIDER_PORT=5656
PROVIDER_PREFIX=evolution
AUTHENTICATION_API_KEY=BQYHJGJHJ  # يجب أن يطابق Evolution API
```

### 2. إنشاء الـ Network (إذا لم يكن موجوداً)

إذا كان الـ network `evolution-net` غير موجود، أنشئه:

```bash
docker network create evolution-net
```

أو إذا كنت تستخدم docker-compose الرئيسي، سيتم إنشاؤه تلقائياً.

### 3. تشغيل السيرفر

#### باستخدام Docker Compose (مُوصى به)

```bash
cd Docker/provider-files
docker-compose up -d
```

> **ملاحظة:** إذا كان الـ network `evolution-net` موجوداً مسبقاً (من docker-compose الرئيسي)، سيتم استخدامه. وإذا لم يكن موجوداً، سيتم إنشاؤه تلقائياً.

#### بدون Docker

```bash
npm install
npm start
```

### 4. التحقق من التشغيل

```bash
# Health check
curl http://localhost:5656/ping
# يجب أن يعيد: pong
```

## ⚙️ الإعداد في Evolution API

### 5. إعداد Evolution API

في ملف `.env` الخاص بـ Evolution API، أضف:

```env
# تفعيل Provider Files
PROVIDER_ENABLED=true
PROVIDER_HOST=provider-files  # اسم الـ container أو IP السيرفر
PROVIDER_PORT=5656
PROVIDER_PREFIX=evolution

# ⚠️ مهم: يجب أن يطابق AUTHENTICATION_API_KEY في Provider Files
AUTHENTICATION_API_KEY=BQYHJGJHJ
```

### إذا كان Provider Files على سيرفر منفصل

```env
PROVIDER_HOST=192.168.1.100  # IP السيرفر الخارجي
PROVIDER_PORT=5656
```

## 📁 هيكل التخزين

الجلسات تُخزن بالشكل التالي:

```
/app/storage/
  └── evolution/              # PREFIX
      └── instance123/        # Instance ID
          ├── creds.json      # بيانات المصادقة
          ├── pre-key-1.json
          ├── pre-key-2.json
          ├── session-1234567890@s.whatsapp.net.json
          └── ...
```

## 🔌 API Endpoints

### Health Check
```
OPTIONS /ping
GET /ping
Response: "pong"
```

### Create Group
```
POST /session
Headers: { apikey: "YOUR_API_KEY" }
Body: { group: "evolution" }
```

### Create Instance
```
POST /session/{prefix}/{instance}
Headers: { apikey: "YOUR_API_KEY" }
Body: { instance: "instance_name" }
```

### Write Data
```
POST /session/{prefix}/{instance}/{key}
Headers: { apikey: "YOUR_API_KEY" }
Body: { data: "json_string" }
```

### Read Data
```
GET /session/{prefix}/{instance}/{key}
Headers: { apikey: "YOUR_API_KEY" }
Response: { data: "json_string" }
```

### Delete Key
```
DELETE /session/{prefix}/{instance}/{key}
Headers: { apikey: "YOUR_API_KEY" }
```

### Delete Instance
```
DELETE /session/{prefix}/{instance}
Headers: { apikey: "YOUR_API_KEY" }
```

### List Instances
```
GET /session/{prefix}/list-instances
Headers: { apikey: "YOUR_API_KEY" }
Response: ["instance1", "instance2", ...]
```

## 🔒 الأمان

- جميع الطلبات تتطلب `apikey` في الـ headers
- يجب أن يطابق `apikey` قيمة `AUTHENTICATION_API_KEY`
- يُنصح باستخدام HTTPS في الإنتاج

## 📦 Docker Compose Integration

يمكن إضافة Provider Files إلى `docker-compose.yaml` الرئيسي:

```yaml
services:
  provider-files:
    build:
      context: ./Docker/provider-files
      dockerfile: Dockerfile
    container_name: provider-files
    restart: always
    ports:
      - "5656:5656"
    environment:
      - PROVIDER_PORT=5656
      - PROVIDER_PREFIX=${PROVIDER_PREFIX:-evolution}
      - AUTHENTICATION_API_KEY=${AUTHENTICATION_API_KEY}
    volumes:
      - provider_storage:/app/storage
    networks:
      - evolution-net

volumes:
  provider_storage:
```

## 🔍 Troubleshooting

### السيرفر لا يبدأ

```bash
# تحقق من الـ logs
docker-compose logs provider-files

# تحقق من أن الـ network موجود
docker network ls | grep evolution-net
```

### Evolution API لا يتصل

1. تحقق من أن `PROVIDER_ENABLED=true`
2. تحقق من أن `AUTHENTICATION_API_KEY` متطابق
3. تحقق من أن `PROVIDER_HOST` صحيح
4. تحقق من الـ logs في Evolution API

### الجلسات لا تُحفظ

- تحقق من صلاحيات مجلد `/app/storage`
- تحقق من أن الـ volume mount صحيح
- تحقق من الـ logs

## 📊 Monitoring

```bash
# Health check
curl http://localhost:5656/ping

# List instances (يتطلب API key)
curl -H "apikey: YOUR_API_KEY" \
  http://localhost:5656/session/evolution/list-instances
```

## 🔄 Backup

لعمل نسخة احتياطية من الجلسات:

```bash
# Backup
docker exec provider-files tar -czf /tmp/backup.tar.gz /app/storage

# Restore
docker exec -i provider-files tar -xzf /tmp/backup.tar.gz -C /
```

## 📝 ملاحظات

- الجلسات تُحفظ بشكل دائم في Docker Volume
- يمكن مشاركة نفس الـ volume بين عدة containers
- يُنصح بعمل backup دوري للجلسات
- حجم التخزين يعتمد على عدد الـ instances والمفاتيح

## 🆘 الدعم

في حالة وجود مشاكل:
1. تحقق من الـ logs: `docker-compose logs provider-files`
2. تحقق من إعدادات Evolution API
3. تأكد من تطابق `AUTHENTICATION_API_KEY`

## 📄 الترخيص

Apache License 2.0

