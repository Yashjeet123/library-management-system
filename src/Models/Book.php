<?php

declare(strict_types=1);

namespace App\Models;

class Book extends LibraryItem
{
    public string $author;
    public string $isbn;
    public string $genre;

    public function __construct(int $id, string $title, int $publicationYear, string $author, string $isbn, string $genre, bool $isAvailable = true)
    {
        parent::__construct($id, $title, $publicationYear, $isAvailable);
        $this->author = $author;
        $this->isbn = $isbn;
        $this->genre = $genre;
    }

    public function getItemDetails(): string
    {
        return sprintf("Book: %s (%s) by %s — ISBN: %s", $this->title, $this->publicationYear, $this->author, $this->isbn);
    }
}
