FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN python -c "import urllib.request; urllib.request.urlretrieve('https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/objects.csv', 'objects.csv')"
RUN python -c "import urllib.request; urllib.request.urlretrieve('https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/published_images.csv', 'published_images.csv')"
RUN python process_data.py

EXPOSE 7860

CMD ["python", "server.py"]